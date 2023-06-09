"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveData = void 0;
const claimBlocksManager_1 = require("../claims/claimBlocksManager");
const claim_1 = require("../claims/claim");
const fs_1 = require("fs");
const fsutil_1 = require("bdsx/fsutil");
var isFileSync = fsutil_1.fsutil.isFileSync;
const event_1 = require("bdsx/event");
const playtime_1 = require("../playerPlaytime/playtime");
const STORAGE_PATH = __dirname + '\\claimsData.json';
function saveData() {
    const playersWithStorage = (0, claimBlocksManager_1.getAllPlayerBlockPairs)();
    const storage = {};
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
    }
    (0, fs_1.writeFileSync)(STORAGE_PATH, JSON.stringify(storage, null, 4));
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
    }
    if (data.serverClaims !== undefined) {
        for (const claimData of data.serverClaims) {
            const claim = claim_1.Claim.fromData(claimData);
            (0, claim_1.registerServerClaim)(claim);
        }
    }
}
event_1.events.serverOpen.on(() => {
    loadData();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yYWdlTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFBbUc7QUFDbkcsMkNBQTBGO0FBQzFGLDJCQUErQztBQUMvQyx3Q0FBbUM7QUFDbkMsSUFBTyxVQUFVLEdBQUcsZUFBTSxDQUFDLFVBQVUsQ0FBQztBQUN0QyxzQ0FBa0M7QUFDbEMseURBQStGO0FBRS9GLE1BQU0sWUFBWSxHQUFHLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQztBQUVyRCxTQUFnQixRQUFRO0lBQ3BCLE1BQU0sa0JBQWtCLEdBQUcsSUFBQSwyQ0FBc0IsR0FBRSxDQUFDO0lBRXBELE1BQU0sT0FBTyxHQUFRLEVBQUUsQ0FBQztJQUV4QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksa0JBQWtCLEVBQUU7UUFDaEQsSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFO1lBQ25CLE9BQU8sQ0FBQyxZQUFZLEdBQUcsSUFBQSxzQkFBYyxFQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVDLFNBQVM7U0FDWjtRQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbkIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFBLHNCQUFjLEVBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFBLHVCQUFZLEVBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFBLDZCQUFrQixFQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3JEO0lBRUQsSUFBQSxrQkFBYSxFQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRSxDQUFDO0FBbkJELDRCQW1CQztBQUVELFNBQVMsUUFBUTtJQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDM0IsT0FBTztLQUNWO0lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBQSxpQkFBWSxFQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNyRCxJQUFJLElBQXFCLENBQUM7SUFDMUIsSUFBSTtRQUNBLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQy9CO0lBQUMsV0FBTTtRQUNKLElBQUEsa0JBQWEsRUFBQyxTQUFTLEdBQUcsb0JBQW9CLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzNFLE9BQU8sQ0FBQyxLQUFLLENBQUMscUNBQXFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekQsSUFBSSxHQUFHLFNBQVMsQ0FBQztLQUNwQjtJQUVELElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUNwQixPQUFPO0tBQ1Y7SUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1FBQ3RCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QixLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUU7WUFDdkMsTUFBTSxLQUFLLEdBQUcsYUFBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QyxJQUFBLHFCQUFhLEVBQUMsS0FBSyxDQUFDLENBQUM7U0FDeEI7UUFFRCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDO1FBQzNDLElBQUEsdUNBQWtCLEVBQUMsSUFBSSxFQUFFLDhCQUFTLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRW5FLElBQUEsNEJBQWlCLEVBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtLQUM1RTtJQUVELElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUU7UUFDakMsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLGFBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEMsSUFBQSwyQkFBbUIsRUFBQyxLQUFLLENBQUMsQ0FBQztTQUM5QjtLQUNKO0FBQ0wsQ0FBQztBQUVELGNBQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRTtJQUN0QixRQUFRLEVBQUUsQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFBIn0=