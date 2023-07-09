"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredXuidsFromStorage = exports.getName = exports.saveData = exports.registerOnRegisteredDataLoaded = exports.registerDataToBeSaved = exports.NON_XUID_STORAGE = void 0;
const claimBlocksManager_1 = require("../claims/claimBlocksManager");
const claim_1 = require("../claims/claim");
const fs_1 = require("fs");
const fsutil_1 = require("bdsx/fsutil");
const event_1 = require("bdsx/event");
const playtime_1 = require("../playerPlaytime/playtime");
const dllManager_1 = require("../Native/dllManager");
const dllTypes_1 = require("../Native/dllTypes");
const packetids_1 = require("bdsx/bds/packetids");
const utils_1 = require("../utils");
const common_1 = require("bdsx/common");
var isFileSync = fsutil_1.fsutil.isFileSync;
const storageUpdater_1 = require("./storageUpdater");
const STORAGE_PATH = __dirname + '\\claimsData.json';
const CURRENT_STORAGE_VERSION = 1;
exports.NON_XUID_STORAGE = [
    "version",
    "serverClaims",
    "serverGroups",
];
const playerNameMap = new Map();
const dataToBeSavedCallbacks = []; // <xuid, [key, data]>
const onDataLoadedCallbacks = new Map();
function registerDataToBeSaved(callback) {
    dataToBeSavedCallbacks.push(callback);
}
exports.registerDataToBeSaved = registerDataToBeSaved;
function registerOnRegisteredDataLoaded(key, callback) {
    onDataLoadedCallbacks.set(key, callback);
}
exports.registerOnRegisteredDataLoaded = registerOnRegisteredDataLoaded;
function saveData() {
    const playersWithStorage = playerNameMap.entries();
    const storage = {};
    storage.version = CURRENT_STORAGE_VERSION;
    const extraData = [];
    for (const callback of dataToBeSavedCallbacks) {
        extraData.push(callback());
    }
    for (const [xuid, name] of playersWithStorage) {
        storage[xuid] = {};
        const ownedClaims = (0, claim_1.getOwnedClaims)(xuid);
        const memberClaimData = [];
        for (const claim of ownedClaims) {
            const memberXuids = claim.getMemberXuids();
            const membersData = {};
            for (const xuid of memberXuids) {
                const memberPermMap = claim.getMemberPermissions(xuid);
                const permData = {};
                for (const [permission, value] of memberPermMap.entries()) {
                    permData[permission] = value;
                }
                membersData[xuid] = permData;
            }
            memberClaimData.push({
                owner: claim.owner,
                name: claim.getName(true),
                id: claim.id,
                cornerOne: claim.cornerOne,
                cornerEight: claim.cornerEight,
                dimension: claim.dimension,
                members: membersData
            });
        }
        storage[xuid].groups = (0, claim_1.getOwnedGroups)(xuid);
        storage[xuid].claims = memberClaimData;
        storage[xuid].blockInfo = (0, claimBlocksManager_1.getPlayerBlockInfo)(xuid);
        storage[xuid].totalTime = (0, playtime_1.getTotalTime)(xuid);
        storage[xuid].paidTime = (0, playtime_1.getTimeRewardedFor)(xuid);
        storage[xuid].name = name;
        const playtimeRewardMap = (0, playtime_1.getPlaytimeRewardInfo)(xuid);
        const rewardInfos = [];
        if (playtimeRewardMap !== undefined) {
            for (const [, rewardInfo] of playtimeRewardMap.entries()) {
                rewardInfos.push(rewardInfo);
            }
        }
        storage[xuid].extraRewardInfo = rewardInfos;
        if (extraData.length !== 0) {
            storage[xuid].extraData = {};
        }
        for (const map of extraData) {
            const data = map.get(xuid);
            if (data === undefined) {
                continue;
            }
            storage[xuid].extraData[data[0]] = data[1];
        }
    }
    const serverClaims = (0, claim_1.getOwnedClaims)("SERVER");
    const serverClaimsData = [];
    for (const claim of serverClaims) {
        const memberXuids = claim.getMemberXuids();
        const membersData = {};
        for (const xuid of memberXuids) {
            const memberPermMap = claim.getMemberPermissions(xuid);
            const permData = {};
            for (const [permission, value] of memberPermMap.entries()) {
                permData[permission] = value;
            }
            membersData[xuid] = permData;
        }
        serverClaimsData.push({
            owner: claim.owner,
            name: claim.getName(true),
            id: claim.id,
            cornerOne: claim.cornerOne,
            cornerEight: claim.cornerEight,
            dimension: claim.dimension,
            members: membersData
        });
    }
    storage.serverClaims = serverClaimsData;
    const serverGroups = (0, claim_1.getOwnedGroups)("SERVER");
    const serverGroupData = [];
    for (const group of serverGroups) {
        const memberPermissions = {};
        const memberXuids = Object.keys(group.members);
        for (const xuid of memberXuids) {
            const permissionMap = group.members[xuid];
            const permRecord = {};
            for (const [perm, value] of permissionMap.entries()) {
                permRecord[perm] = value;
            }
            memberPermissions[xuid] = permRecord;
        }
        serverGroupData.push({
            groupId: group.groupId,
            groupName: group.groupName,
            ownerXuid: group.ownerXuid,
            claimIds: group.claimIds,
            members: memberPermissions,
        });
    }
    storage.serverGroups = serverGroupData;
    (0, fs_1.writeFileSync)(STORAGE_PATH, JSON.stringify(storage, null, 4));
    const nativeStorage = dllTypes_1.NativeStorageObject.uglyConstruct(storage);
    (0, dllManager_1.updateStorageInNative)(nativeStorage);
}
exports.saveData = saveData;
function loadData() {
    if (!isFileSync(STORAGE_PATH)) {
        return;
    }
    const fileData = (0, fs_1.readFileSync)(STORAGE_PATH, 'utf-8');
    let data;
    try {
        data = JSON.parse(fileData);
    }
    catch (_a) {
        (0, fs_1.writeFileSync)(__dirname + `\\claimsData-ERR-${Date.now()}.json`, fileData);
        console.error('ERROR LOADING STORAGE: INVALID JSON'.red);
        data = undefined;
    }
    if (data === undefined) {
        return;
    }
    if (data.version !== CURRENT_STORAGE_VERSION) {
        data = updateStorageFromVersion(data, data.version);
    }
    const xuids = getStoredXuidsFromStorage(data);
    for (const xuid of xuids) {
        const playerData = data[xuid];
        for (const claimData of playerData.claims) {
            const claim = claim_1.Claim.fromData(claimData);
            (0, claim_1.registerClaim)(claim);
        }
        const blockInfoData = playerData.blockInfo;
        (0, claimBlocksManager_1.setPlayerBlockInfo)(xuid, claimBlocksManager_1.BlockInfo.fromData(blockInfoData), false);
        (0, playtime_1.setPlayerPlaytime)(xuid, playerData.paidTime, false, playerData.totalTime);
        for (const rewardInfoData of playerData.extraRewardInfo) {
            const rewardInfo = playtime_1.PlaytimeRewardInfo.fromData(rewardInfoData);
            (0, playtime_1.addPlaytimeRewardInfo)(xuid, rewardInfo);
        }
        if (Object.keys(playerData).includes('name')) {
            playerNameMap.set(xuid, playerData.name);
        }
        if (Object.keys(playerData).includes('groups')) {
            const groupDatas = playerData.groups;
            for (const groupData of groupDatas) {
                const group = claim_1.ClaimGroup.fromData(groupData);
                (0, claim_1.registerClaimGroup)(group);
            }
        }
        if (playerData.extraData !== undefined) {
            const keys = Object.keys(playerData.extraData);
            for (const key of keys) {
                const data = playerData.extraData[key];
                const callback = onDataLoadedCallbacks.get(key);
                if (callback !== undefined) {
                    callback(xuid, data);
                }
            }
        }
    }
    if (data.serverClaims !== undefined) {
        for (const claimData of data.serverClaims) {
            const claim = claim_1.Claim.fromData(claimData);
            (0, claim_1.registerServerClaim)(claim);
        }
    }
    if (data.serverGroups !== undefined) {
        for (const groupData of data.serverGroups) {
            const group = claim_1.ClaimGroup.fromData(groupData);
            (0, claim_1.registerServerClaimGroup)(group);
        }
    }
    const nativeStorage = dllTypes_1.NativeStorageObject.uglyConstruct(data);
    (0, dllManager_1.updateStorageInNative)(nativeStorage);
}
event_1.events.serverOpen.on(() => {
    loadData();
});
event_1.events.packetRaw(packetids_1.MinecraftPacketIds.Login).on((pkt) => {
    const playerData = (0, utils_1.getXuidFromLoginPkt)(pkt);
    if (playerData === undefined) {
        // Something is wrong with their login packet
        return common_1.CANCEL;
    }
    const [xuid, name] = playerData;
    playerNameMap.set(xuid, name);
});
function getName(xuid) {
    return playerNameMap.get(xuid);
}
exports.getName = getName;
function updateStorageFromVersion(storage, version) {
    let newStorage;
    switch (version) {
        case undefined:
            newStorage = (0, storageUpdater_1.updateFromNoVersion)(storage);
    }
    newStorage.version = CURRENT_STORAGE_VERSION;
    (0, fs_1.writeFileSync)(STORAGE_PATH, JSON.stringify(newStorage, null, 4));
    return newStorage;
}
function getStoredXuidsFromStorage(storage) {
    const retXuids = [];
    for (const key in storage) {
        if (exports.NON_XUID_STORAGE.includes(key)) {
            continue;
        }
        retXuids.push(key);
    }
    return retXuids;
}
exports.getStoredXuidsFromStorage = getStoredXuidsFromStorage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yYWdlTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBK0Y7QUFDL0YsMkNBT3lCO0FBQ3pCLDJCQUErQztBQUMvQyx3Q0FBbUM7QUFDbkMsc0NBQWtDO0FBQ2xDLHlEQU9vQztBQUNwQyxxREFBMkQ7QUFDM0QsaURBQXVEO0FBQ3ZELGtEQUFzRDtBQUN0RCxvQ0FBNkM7QUFDN0Msd0NBQW1DO0FBQ25DLElBQU8sVUFBVSxHQUFHLGVBQU0sQ0FBQyxVQUFVLENBQUM7QUFDdEMscURBQXFEO0FBRXJELE1BQU0sWUFBWSxHQUFHLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQztBQUNyRCxNQUFNLHVCQUF1QixHQUFHLENBQUMsQ0FBQztBQUNyQixRQUFBLGdCQUFnQixHQUFHO0lBQzVCLFNBQVM7SUFDVCxjQUFjO0lBQ2QsY0FBYztDQUNqQixDQUFBO0FBRUQsTUFBTSxhQUFhLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFckQsTUFBTSxzQkFBc0IsR0FBeUMsRUFBRSxDQUFDLENBQUMsc0JBQXNCO0FBQy9GLE1BQU0scUJBQXFCLEdBQW1ELElBQUksR0FBRyxFQUFFLENBQUM7QUFFeEYsU0FBZ0IscUJBQXFCLENBQUMsUUFBMEM7SUFDNUUsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFGRCxzREFFQztBQUVELFNBQWdCLDhCQUE4QixDQUFDLEdBQVcsRUFBRSxRQUEyQztJQUNuRyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFGRCx3RUFFQztBQUVELFNBQWdCLFFBQVE7SUFDcEIsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFbkQsTUFBTSxPQUFPLEdBQVEsRUFBRSxDQUFDO0lBRXhCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsdUJBQXVCLENBQUM7SUFFMUMsTUFBTSxTQUFTLEdBQWlDLEVBQUUsQ0FBQztJQUVuRCxLQUFLLE1BQU0sUUFBUSxJQUFJLHNCQUFzQixFQUFFO1FBQzNDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztLQUM5QjtJQUVELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxrQkFBa0IsRUFBRTtRQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRW5CLE1BQU0sV0FBVyxHQUFHLElBQUEsc0JBQWMsRUFBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxNQUFNLGVBQWUsR0FBVSxFQUFFLENBQUM7UUFDbEMsS0FBSyxNQUFNLEtBQUssSUFBSSxXQUFXLEVBQUU7WUFDN0IsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzNDLE1BQU0sV0FBVyxHQUFRLEVBQUUsQ0FBQztZQUM1QixLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRTtnQkFDNUIsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBRSxDQUFDO2dCQUV4RCxNQUFNLFFBQVEsR0FBUSxFQUFFLENBQUM7Z0JBQ3pCLEtBQUssTUFBTSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQ3ZELFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxLQUFLLENBQUM7aUJBQ2hDO2dCQUVELFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUM7YUFDaEM7WUFFRCxlQUFlLENBQUMsSUFBSSxDQUFDO2dCQUNqQixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7Z0JBQ2xCLElBQUksRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDekIsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNaLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztnQkFDMUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2dCQUM5QixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7Z0JBQzFCLE9BQU8sRUFBRSxXQUFXO2FBQ3ZCLENBQUMsQ0FBQTtTQUNMO1FBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFBLHNCQUFjLEVBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUM7UUFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFBLHVDQUFrQixFQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25ELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsSUFBQSx1QkFBWSxFQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEdBQUcsSUFBQSw2QkFBa0IsRUFBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUUxQixNQUFNLGlCQUFpQixHQUFHLElBQUEsZ0NBQXFCLEVBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEQsTUFBTSxXQUFXLEdBQXlCLEVBQUUsQ0FBQztRQUU3QyxJQUFJLGlCQUFpQixLQUFLLFNBQVMsRUFBRTtZQUNqQyxLQUFLLE1BQU0sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUN0RCxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ2hDO1NBQ0o7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxHQUFHLFdBQVcsQ0FBQztRQUU1QyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1NBQ2hDO1FBRUQsS0FBSyxNQUFNLEdBQUcsSUFBSSxTQUFTLEVBQUU7WUFDekIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQ3BCLFNBQVM7YUFDWjtZQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzlDO0tBQ0o7SUFFRCxNQUFNLFlBQVksR0FBRyxJQUFBLHNCQUFjLEVBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsTUFBTSxnQkFBZ0IsR0FBVSxFQUFFLENBQUM7SUFDbkMsS0FBSyxNQUFNLEtBQUssSUFBSSxZQUFZLEVBQUU7UUFDOUIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzNDLE1BQU0sV0FBVyxHQUFRLEVBQUUsQ0FBQztRQUM1QixLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRTtZQUM1QixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFFLENBQUM7WUFFeEQsTUFBTSxRQUFRLEdBQVEsRUFBRSxDQUFDO1lBQ3pCLEtBQUssTUFBTSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ3ZELFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxLQUFLLENBQUM7YUFDaEM7WUFFRCxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDO1NBQ2hDO1FBRUQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO1lBQ2xCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixJQUFJLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDekIsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFO1lBQ1osU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1lBQzFCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztZQUM5QixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsT0FBTyxFQUFFLFdBQVc7U0FDdkIsQ0FBQyxDQUFBO0tBQ0w7SUFFRCxPQUFPLENBQUMsWUFBWSxHQUFHLGdCQUFnQixDQUFDO0lBRXhDLE1BQU0sWUFBWSxHQUFHLElBQUEsc0JBQWMsRUFBQyxRQUFRLENBQUMsQ0FBQztJQUM5QyxNQUFNLGVBQWUsR0FBVSxFQUFFLENBQUM7SUFDbEMsS0FBSyxNQUFNLEtBQUssSUFBSSxZQUFZLEVBQUU7UUFDOUIsTUFBTSxpQkFBaUIsR0FBUSxFQUFFLENBQUM7UUFDbEMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0MsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUU7WUFDNUIsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQyxNQUFNLFVBQVUsR0FBNEIsRUFBRSxDQUFDO1lBQy9DLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ2pELFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7YUFDNUI7WUFFRCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUM7U0FDeEM7UUFFRCxlQUFlLENBQUMsSUFBSSxDQUFDO1lBQ2pCLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztZQUN0QixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1lBQzFCLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTtZQUN4QixPQUFPLEVBQUUsaUJBQWlCO1NBQzdCLENBQUMsQ0FBQTtLQUNMO0lBRUQsT0FBTyxDQUFDLFlBQVksR0FBRyxlQUFlLENBQUM7SUFFdkMsSUFBQSxrQkFBYSxFQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU5RCxNQUFNLGFBQWEsR0FBRyw4QkFBbUIsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakUsSUFBQSxrQ0FBcUIsRUFBQyxhQUFhLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBdklELDRCQXVJQztBQUVELFNBQVMsUUFBUTtJQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDM0IsT0FBTztLQUNWO0lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBQSxpQkFBWSxFQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNyRCxJQUFJLElBQXFCLENBQUM7SUFDMUIsSUFBSTtRQUNBLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQy9CO0lBQUMsV0FBTTtRQUNKLElBQUEsa0JBQWEsRUFBQyxTQUFTLEdBQUcsb0JBQW9CLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzNFLE9BQU8sQ0FBQyxLQUFLLENBQUMscUNBQXFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekQsSUFBSSxHQUFHLFNBQVMsQ0FBQztLQUNwQjtJQUVELElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUNwQixPQUFPO0tBQ1Y7SUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssdUJBQXVCLEVBQUU7UUFDMUMsSUFBSSxHQUFHLHdCQUF3QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDdkQ7SUFFRCxNQUFNLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtRQUN0QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFOUIsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLGFBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEMsSUFBQSxxQkFBYSxFQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3hCO1FBRUQsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQztRQUMzQyxJQUFBLHVDQUFrQixFQUFDLElBQUksRUFBRSw4QkFBUyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVuRSxJQUFBLDRCQUFpQixFQUFDLElBQUksRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFekUsS0FBSyxNQUFNLGNBQWMsSUFBSSxVQUFVLENBQUMsZUFBZSxFQUFFO1lBQ3JELE1BQU0sVUFBVSxHQUFHLDZCQUFrQixDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUMvRCxJQUFBLGdDQUFxQixFQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztTQUMzQztRQUVELElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDMUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzVDO1FBRUQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUM1QyxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3JDLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFO2dCQUNoQyxNQUFNLEtBQUssR0FBRyxrQkFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFFN0MsSUFBQSwwQkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQzthQUM3QjtTQUNKO1FBRUQsSUFBSSxVQUFVLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTtZQUNwQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUUvQyxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDcEIsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxRQUFRLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7b0JBQ3hCLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQ3hCO2FBQ0o7U0FDSjtLQUNKO0lBRUQsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRTtRQUNqQyxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDdkMsTUFBTSxLQUFLLEdBQUcsYUFBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QyxJQUFBLDJCQUFtQixFQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzlCO0tBQ0o7SUFFRCxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssU0FBUyxFQUFFO1FBQ2pDLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtZQUN2QyxNQUFNLEtBQUssR0FBRyxrQkFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM3QyxJQUFBLGdDQUF3QixFQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ25DO0tBQ0o7SUFFRCxNQUFNLGFBQWEsR0FBRyw4QkFBbUIsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUQsSUFBQSxrQ0FBcUIsRUFBQyxhQUFhLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRUQsY0FBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFO0lBQ3RCLFFBQVEsRUFBRSxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUE7QUFFRixjQUFNLENBQUMsU0FBUyxDQUFDLDhCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ2xELE1BQU0sVUFBVSxHQUFHLElBQUEsMkJBQW1CLEVBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUMsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO1FBQzFCLDZDQUE2QztRQUM3QyxPQUFPLGVBQU0sQ0FBQztLQUNqQjtJQUVELE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDO0lBRWhDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFBO0FBRUYsU0FBZ0IsT0FBTyxDQUFDLElBQVk7SUFDaEMsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFGRCwwQkFFQztBQUVELFNBQVMsd0JBQXdCLENBQUMsT0FBWSxFQUFFLE9BQWU7SUFDM0QsSUFBSSxVQUFVLENBQUM7SUFDZixRQUFRLE9BQU8sRUFBRTtRQUNiLEtBQUssU0FBUztZQUNWLFVBQVUsR0FBRyxJQUFBLG9DQUFtQixFQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ2pEO0lBRUQsVUFBVSxDQUFDLE9BQU8sR0FBRyx1QkFBdUIsQ0FBQztJQUU3QyxJQUFBLGtCQUFhLEVBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRWpFLE9BQU8sVUFBVSxDQUFDO0FBQ3RCLENBQUM7QUFFRCxTQUFnQix5QkFBeUIsQ0FBQyxPQUFZO0lBQ2xELE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztJQUU5QixLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTtRQUN2QixJQUFJLHdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNoQyxTQUFTO1NBQ1o7UUFFRCxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3RCO0lBRUQsT0FBTyxRQUFRLENBQUM7QUFDcEIsQ0FBQztBQVpELDhEQVlDIn0=