"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFromNoVersion = void 0;
// This expects AT LEAST a version v1.1.0 Storage data, if you have a storage file older than this you will need to get that version first to update
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
    return newStorageData;
}
exports.updateFromNoVersion = updateFromNoVersion;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVVwZGF0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yYWdlVXBkYXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvSkFBb0o7QUFDcEosU0FBZ0IsbUJBQW1CLENBQUMsV0FBZ0I7SUFDaEQsNkNBQTZDO0lBQzdDLE1BQU0sY0FBYyxHQUFRLEVBQUUsQ0FBQztJQUUvQixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzdDLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxFQUFFO1FBQzVCLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyQyxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFDM0IsSUFBSSxhQUFhLENBQUM7UUFDbEIsSUFBSSxJQUFJLEtBQUssY0FBYyxFQUFFO1lBQ3pCLGNBQWMsR0FBRyxJQUFJLENBQUM7WUFDdEIsYUFBYSxHQUFHLFVBQVUsQ0FBQztTQUM5QjthQUFNO1lBQ0gsYUFBYSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7U0FDckM7UUFFRCxNQUFNLGFBQWEsR0FBVSxFQUFFLENBQUM7UUFDaEMsS0FBSyxNQUFNLEtBQUssSUFBSSxhQUFhLEVBQUU7WUFDL0IsTUFBTSxjQUFjLEdBQVEsRUFBRSxDQUFDO1lBQy9CLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9DLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxFQUFFO2dCQUM1QixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQztnQkFFdEQsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxDQUFDO2FBQ3REO1lBRUQsYUFBYSxDQUFDLElBQUksQ0FBQztnQkFDWCxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7Z0JBQ2xCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtnQkFDaEIsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUNaLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztnQkFDMUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2dCQUM5QixTQUFTLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsY0FBYzthQUM5QixDQUFDLENBQUM7U0FDTjtRQUVELElBQUksY0FBYyxFQUFFO1lBQ2hCLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLENBQUM7U0FDeEM7YUFBTTtZQUNILGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRztnQkFDbkIsTUFBTSxFQUFFLGFBQWE7Z0JBQ3JCLFNBQVMsRUFBRSxVQUFVLENBQUMsU0FBUztnQkFDL0IsU0FBUyxFQUFFLFVBQVUsQ0FBQyxTQUFTO2dCQUMvQixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7Z0JBQzdCLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSTtnQkFDckIsZUFBZSxFQUFFLFVBQVUsQ0FBQyxlQUFlO2FBQzlDLENBQUE7U0FDSjtLQUNKO0lBRUQsT0FBTyxjQUFjLENBQUM7QUFDMUIsQ0FBQztBQXJERCxrREFxREMifQ==