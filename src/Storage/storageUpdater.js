"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFrom1Version = exports.updateFromNoVersion = void 0;
// This expects AT LEAST a version v1.1.0 Storage data, if you have a storage file older than this you will need to get that version first to update
const storageManager_1 = require("./storageManager");
function updateFromNoVersion(storageData) {
    // Only change here is the member permissions
    const newStorageData = {};
    const playerXuids = Object.keys(storageData);
    for (const xuid of playerXuids) {
        const playerData = storageData[xuid];
        let isServerClaims = false;
        let oldClaimsData;
        if (xuid === "serverClaims") {
            isServerClaims = true;
            oldClaimsData = playerData;
        }
        else {
            oldClaimsData = playerData.claims;
        }
        const newClaimsData = [];
        for (const claim of oldClaimsData) {
            const newMembersData = {};
            const memberXuids = Object.keys(claim.members);
            for (const xuid of memberXuids) {
                const canAddValue = claim.members[xuid].canAddPlayers;
                newMembersData[xuid] = { edit_members: canAddValue };
            }
            newClaimsData.push({
                owner: claim.owner,
                name: claim.name,
                id: claim.id,
                cornerOne: claim.cornerOne,
                cornerEight: claim.cornerEight,
                dimension: 0,
                members: newMembersData,
            });
        }
        if (isServerClaims) {
            newStorageData[xuid] = newClaimsData;
        }
        else {
            newStorageData[xuid] = {
                claims: newClaimsData,
                blockInfo: playerData.blockInfo,
                totalTime: playerData.totalTime,
                paidTime: playerData.paidTime,
                name: playerData.name,
                extraRewardInfo: playerData.extraRewardInfo,
            };
        }
    }
    updateFrom1Version(newStorageData);
    return newStorageData;
}
exports.updateFromNoVersion = updateFromNoVersion;
function updateFrom1Version(storageData) {
    // Updated claims/groups with coOwners string array
    const storageKeys = Object.keys(storageData);
    let storageXuids = storageKeys.filter((value) => {
        return !storageManager_1.NON_XUID_STORAGE.includes(value);
    });
    for (const xuid of storageXuids) {
        const memberData = storageData[xuid];
        for (let i = 0; i < memberData.claims.length; i++) {
            memberData.claims[i].coOwners = [];
        }
        for (let i = 0; i < memberData.groups.length; i++) {
            memberData.groups[i].coOwners = [];
        }
        storageData[xuid] = memberData;
    }
    for (let i = 0; i < storageData.serverClaims.length; i++) {
        storageData.serverClaims[i].coOwners = [];
    }
    for (let i = 0; i < storageData.serverGroups; i++) {
        storageData.serverGroups[i].coOwners = [];
    }
    return storageData;
}
exports.updateFrom1Version = updateFrom1Version;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVVwZGF0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yYWdlVXBkYXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvSkFBb0o7QUFDcEoscURBQWtEO0FBRWxELFNBQWdCLG1CQUFtQixDQUFDLFdBQWdCO0lBQ2hELDZDQUE2QztJQUM3QyxNQUFNLGNBQWMsR0FBUSxFQUFFLENBQUM7SUFFL0IsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3QyxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRTtRQUM1QixNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckMsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBQzNCLElBQUksYUFBYSxDQUFDO1FBQ2xCLElBQUksSUFBSSxLQUFLLGNBQWMsRUFBRTtZQUN6QixjQUFjLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLGFBQWEsR0FBRyxVQUFVLENBQUM7U0FDOUI7YUFBTTtZQUNILGFBQWEsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO1NBQ3JDO1FBRUQsTUFBTSxhQUFhLEdBQVUsRUFBRSxDQUFDO1FBQ2hDLEtBQUssTUFBTSxLQUFLLElBQUksYUFBYSxFQUFFO1lBQy9CLE1BQU0sY0FBYyxHQUFRLEVBQUUsQ0FBQztZQUMvQixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRTtnQkFDNUIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUM7Z0JBRXRELGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDLFlBQVksRUFBRSxXQUFXLEVBQUMsQ0FBQzthQUN0RDtZQUVELGFBQWEsQ0FBQyxJQUFJLENBQUM7Z0JB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