// This expects AT LEAST a version v1.1.0 Storage data, if you have a storage file older than this you will need to get that version first to update
export function updateFromNoVersion(storageData: any) {
    // Only change here is the member permissions
    const newStorageData: any = {};

    const playerXuids = Object.keys(storageData);
    for (const xuid of playerXuids) {
        const playerData = storageData[xuid];

        let isServerClaims = false;
        let oldClaimsData;
        if (xuid === "serverClaims") {
            isServerClaims = true;
            oldClaimsData = playerData;
        } else {
            oldClaimsData = playerData.claims;
        }

        const newClaimsData: any[] = [];
        for (const claim of oldClaimsData) {
            const newMembersData: any = {};
            const memberXuids = Object.keys(claim.members);
            for (const xuid of memberXuids) {
                const canAddValue = claim.members[xuid].canAddPlayers;

                newMembersData[xuid] = {edit_members: canAddValue};
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
        } else {
            newStorageData[xuid] = {
                claims: newClaimsData,
                blockInfo: playerData.blockInfo,
                totalTime: playerData.totalTime,
                paidTime: playerData.paidTime,
                name: playerData.name,
                extraRewardInfo: playerData.extraRewardInfo,
            }
        }
    }

    return newStorageData;
}