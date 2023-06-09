import {BlockInfo, getAllPlayerBlockPairs, setPlayerBlockInfo} from "../claims/claimBlocksManager";
import {Claim, getOwnedClaims, registerClaim, registerServerClaim} from "../claims/claim";
import {readFileSync, writeFileSync} from "fs";
import {fsutil} from "bdsx/fsutil";
import isFileSync = fsutil.isFileSync;
import {events} from "bdsx/event";
import {getTimeRewardedFor, getTotalTime, setPlayerPlaytime} from "../playerPlaytime/playtime";

const STORAGE_PATH = __dirname + '\\claimsData.json';

export function saveData() {
    const playersWithStorage = getAllPlayerBlockPairs();

    const storage: any = {};

    for (const [xuid, blockInfo] of playersWithStorage) {
        if (xuid === 'SERVER') {
            storage.serverClaims = getOwnedClaims(xuid);
            continue;
        }

        storage[xuid] = {};
        storage[xuid].claims = getOwnedClaims(xuid);
        storage[xuid].blockInfo = blockInfo;
        storage[xuid].totalTime = getTotalTime(xuid);
        storage[xuid].paidTime = getTimeRewardedFor(xuid);
    }

    writeFileSync(STORAGE_PATH, JSON.stringify(storage, null, 4));
}

function loadData() {
    if (!isFileSync(STORAGE_PATH)) {
        return;
    }

    const data = JSON.parse(readFileSync(STORAGE_PATH, 'utf-8'));
    const xuids = Object.keys(data);
    for (const xuid of xuids) {
        const playerData = data[xuid];
        for (const claimData of playerData.claims) {
            const claim = Claim.fromData(claimData);
            registerClaim(claim);
        }

        const blockInfoData = playerData.blockInfo;
        setPlayerBlockInfo(xuid, BlockInfo.fromData(blockInfoData), false);

        setPlayerPlaytime(xuid, playerData.paidTime, false, playerData.totalTime)
    }

    if (data.serverClaims !== undefined) {
        for (const claimData of data.serverClaims) {
            const claim = Claim.fromData(claimData);
            registerServerClaim(claim);
        }
    }
}

events.serverOpen.on(() => {
    loadData();
})