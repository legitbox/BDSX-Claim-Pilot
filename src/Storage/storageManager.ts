import {BlockInfo, getPlayerBlockInfo, setPlayerBlockInfo} from "../claims/claimBlocksManager";
import {
    Claim,
    ClaimGroup,
    getOwnedClaims,
    getOwnedGroups,
    registerClaim, registerClaimGroup,
    registerServerClaim, registerServerClaimGroup
} from "../claims/claim";
import {readFileSync, writeFileSync} from "fs";
import {fsutil} from "bdsx/fsutil";
import {events} from "bdsx/event";
import {
    addPlaytimeRewardInfo,
    getPlaytimeRewardInfo,
    getTimeRewardedFor,
    getTotalTime,
    PlaytimeRewardInfo,
    setPlayerPlaytime
} from "../playerPlaytime/playtime";
import {updateStorageInNative} from "../Native/dllManager";
import {NativeStorageObject} from "../Native/dllTypes";
import {MinecraftPacketIds} from "bdsx/bds/packetids";
import {getXuidFromLoginPkt} from "../utils";
import {CANCEL} from "bdsx/common";
import isFileSync = fsutil.isFileSync;
import {updateFromNoVersion} from "./storageUpdater";

const STORAGE_PATH = __dirname + '\\claimsData.json';
const CURRENT_STORAGE_VERSION = 1;
export const NON_XUID_STORAGE = [
    "version",
    "serverClaims",
]

const playerNameMap: Map<string, string> = new Map();

const dataToBeSavedCallbacks: (() => Map<string, [string, any]>)[] = []; // <xuid, [key, data]>
const onDataLoadedCallbacks: Map<string, (xuid: string, data: any) => void> = new Map();

export function registerDataToBeSaved(callback: () => Map<string, [string, any]>) {
    dataToBeSavedCallbacks.push(callback);
}

export function registerOnRegisteredDataLoaded(key: string, callback: (xuid: string, data: any) => void) {
    onDataLoadedCallbacks.set(key, callback);
}

export function saveData() {
    const playersWithStorage = playerNameMap.entries();

    const storage: any = {};

    storage.version = CURRENT_STORAGE_VERSION;

    const extraData: Map<string, [string, any]>[] = [];

    for (const callback of dataToBeSavedCallbacks) {
        extraData.push(callback());
    }

    for (const [xuid, name] of playersWithStorage) {
        storage[xuid] = {};

        const ownedClaims = getOwnedClaims(xuid);
        const memberClaimData: any[] = [];
        for (const claim of ownedClaims) {
            const memberXuids = claim.getMemberXuids();
            const membersData: any = {};
            for (const xuid of memberXuids) {
                const memberPermMap = claim.getMemberPermissions(xuid)!;

                const permData: any = {};
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
            })
        }

        storage[xuid].groups = getOwnedGroups(xuid);
        storage[xuid].claims = memberClaimData;
        storage[xuid].blockInfo = getPlayerBlockInfo(xuid);
        storage[xuid].totalTime = getTotalTime(xuid);
        storage[xuid].paidTime = getTimeRewardedFor(xuid);
        storage[xuid].name = name;

        const playtimeRewardMap = getPlaytimeRewardInfo(xuid);

        const rewardInfos: PlaytimeRewardInfo[] = [];

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

    const serverClaims = getOwnedClaims("SERVER");
    const serverClaimsData: any[] = [];
    for (const claim of serverClaims) {
        const memberXuids = claim.getMemberXuids();
        const membersData: any = {};
        for (const xuid of memberXuids) {
            const memberPermMap = claim.getMemberPermissions(xuid)!;

            const permData: any = {};
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
        })
    }

    storage.serverClaims = serverClaimsData;

    const serverGroups = getOwnedGroups("SERVER");
    const serverGroupData: any[] = [];
    for (const group of serverGroups) {
        const memberPermissions: any = {};
        const memberXuids = Object.keys(group.members);
        for (const xuid of memberXuids) {
            const permissionMap = group.members[xuid];
            const permRecord: Record<string, boolean> = {};
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
        })
    }

    storage.serverGroups = serverGroupData;

    writeFileSync(STORAGE_PATH, JSON.stringify(storage, null, 4));

    const nativeStorage = NativeStorageObject.uglyConstruct(storage);
    updateStorageInNative(nativeStorage);
}

function loadData() {
    if (!isFileSync(STORAGE_PATH)) {
        return;
    }

    const fileData = readFileSync(STORAGE_PATH, 'utf-8');
    let data: any | undefined;
    try {
        data = JSON.parse(fileData);
    } catch {
        writeFileSync(__dirname + `\\claimsData-ERR-${Date.now()}.json`, fileData);
        console.error('ERROR LOADING STORAGE: INVALID JSON'.red);
        data = undefined;
    }

    if (data === undefined) {
        return;
    }

    if (data.version !== CURRENT_STORAGE_VERSION) {
        data = updateStorageFromVersion(data, data.version);
    }

    const xuids = Object.keys(data);
    for (const xuid of xuids) {
        const playerData = data[xuid];

        if (NON_XUID_STORAGE.includes(xuid)) {
            continue; // Not player storage
        }

        for (const claimData of playerData.claims) {
            const claim = Claim.fromData(claimData);
            registerClaim(claim);
        }

        const blockInfoData = playerData.blockInfo;
        setPlayerBlockInfo(xuid, BlockInfo.fromData(blockInfoData), false);

        setPlayerPlaytime(xuid, playerData.paidTime, false, playerData.totalTime)

        for (const rewardInfoData of playerData.extraRewardInfo) {
            const rewardInfo = PlaytimeRewardInfo.fromData(rewardInfoData);
            addPlaytimeRewardInfo(xuid, rewardInfo);
        }

        if (Object.keys(playerData).includes('name')) {
            playerNameMap.set(xuid, playerData.name);
        }

        if (Object.keys(playerData).includes('groups')) {
            const groupDatas = playerData.groups;
            for (const groupData of groupDatas) {
                const group = ClaimGroup.fromData(groupData);

                registerClaimGroup(group);
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
            const claim = Claim.fromData(claimData);
            registerServerClaim(claim);
        }
    }

    if (data.serverGroups !== undefined) {
        for (const groupData of data.serverGroups) {
            const group = ClaimGroup.fromData(groupData);
            registerServerClaimGroup(group);
        }
    }

    const nativeStorage = NativeStorageObject.uglyConstruct(data);
    updateStorageInNative(nativeStorage);
}

events.serverOpen.on(() => {
    loadData();
})

events.packetRaw(MinecraftPacketIds.Login).on((pkt) => {
    const playerData = getXuidFromLoginPkt(pkt);
    if (playerData === undefined) {
        // Something is wrong with their login packet
        return CANCEL;
    }

    const [xuid, name] = playerData;

    playerNameMap.set(xuid, name);
})

export function getName(xuid: string) {
    return playerNameMap.get(xuid);
}

function updateStorageFromVersion(storage: any, version: number) {
    let newStorage;
    switch (version) {
        case undefined:
            newStorage = updateFromNoVersion(storage);
    }

    newStorage.version = CURRENT_STORAGE_VERSION;

    writeFileSync(STORAGE_PATH, JSON.stringify(newStorage, null, 4));

    return newStorage;
}