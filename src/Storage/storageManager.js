"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveData = exports.registerOnRegisteredDataLoaded = exports.registerDataToBeSaved = void 0;
const claimBlocksManager_1 = require("../claims/claimBlocksManager");
const claim_1 = require("../claims/claim");
const fs_1 = require("fs");
const fsutil_1 = require("bdsx/fsutil");
var isFileSync = fsutil_1.fsutil.isFileSync;
const event_1 = require("bdsx/event");
const playtime_1 = require("../playerPlaytime/playtime");
const dllManager_1 = require("../Native/dllManager");
const dllTypes_1 = require("../Native/dllTypes");
const STORAGE_PATH = __dirname + '\\claimsData.json';
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
    const playersWithStorage = (0, claimBlocksManager_1.getAllPlayerBlockPairs)();
    const storage = {};
    const extraData = [];
    for (const callback of dataToBeSavedCallbacks) {
        extraData.push(callback());
    }
    for (const [xuid, blockInfo] of playersWithStorage) {
        if (xuid === 'SERVER') {
            storage.serverClaims = (0, claim_1.getOwnedClaims)(xuid);
            continue;
        }
        storage[xuid] = {};
        storage[xuid].claims = (0, claim_1.getOwnedClaims)(xuid);
        storage[xuid].blockInfo = blockInfo;
        storage[xuid].totalTime = (0, playtime_1.getTotalTime)(xuid);
        storage[xuid].paidTime = (0, playtime_1.getTimeRewardedFor)(xuid);
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
    const xuids = Object.keys(data);
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
    const nativeStorage = dllTypes_1.NativeStorageObject.uglyConstruct(data);
    (0, dllManager_1.updateStorageInNative)(nativeStorage);
}
event_1.events.serverOpen.on(() => {
    loadData();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yYWdlTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBbUc7QUFDbkcsMkNBQTBGO0FBQzFGLDJCQUErQztBQUMvQyx3Q0FBbUM7QUFDbkMsSUFBTyxVQUFVLEdBQUcsZUFBTSxDQUFDLFVBQVUsQ0FBQztBQUN0QyxzQ0FBa0M7QUFDbEMseURBTW9DO0FBQ3BDLHFEQUEyRDtBQUMzRCxpREFBdUQ7QUFFdkQsTUFBTSxZQUFZLEdBQUcsU0FBUyxHQUFHLG1CQUFtQixDQUFDO0FBRXJELE1BQU0sc0JBQXNCLEdBQXlDLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQjtBQUMvRixNQUFNLHFCQUFxQixHQUFtRCxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRXhGLFNBQWdCLHFCQUFxQixDQUFDLFFBQTBDO0lBQzVFLHNCQUFzQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRkQsc0RBRUM7QUFFRCxTQUFnQiw4QkFBOEIsQ0FBQyxHQUFXLEVBQUUsUUFBMkM7SUFDbkcscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRkQsd0VBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3BCLE1BQU0sa0JBQWtCLEdBQUcsSUFBQSwyQ0FBc0IsR0FBRSxDQUFDO0lBRXBELE1BQU0sT0FBTyxHQUFRLEVBQUUsQ0FBQztJQUV4QixNQUFNLFNBQVMsR0FBaUMsRUFBRSxDQUFDO0lBRW5ELEtBQUssTUFBTSxRQUFRLElBQUksc0JBQXNCLEVBQUU7UUFDM0MsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0tBQzlCO0lBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLGtCQUFrQixFQUFFO1FBQ2hELElBQUksSUFBSSxLQUFLLFFBQVEsRUFB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