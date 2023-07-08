"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerHasPerms = exports.getClaimFromId = exports.deleteClaim = exports.isAnyClaimInBox = exports.getClaimAtPos = exports.getOwnedOrMemberedClaims = exports.getOwnedClaims = exports.getAllClaims = exports.registerNewClaim = exports.registerNewServerClaim = exports.registerClaim = exports.registerServerClaim = exports.registerClaimGroup = exports.deleteClaimGroup = exports.getOwnedGroups = exports.Claim = exports.ClaimGroup = void 0;
const utils_1 = require("../utils");
const configManager_1 = require("../configManager");
const storageManager_1 = require("../Storage/storageManager");
const claimBlocksManager_1 = require("./claimBlocksManager");
const eventStorage_1 = require("../events/eventStorage");
const claimPermissionManager_1 = require("./claimPermissionManager");
const claimMap = new Map(); // Key: OwnerXUID, value: Owned claims
const claimGroups = new Map();
class ClaimGroup {
    constructor(groupId, groupName, ownerXuid, claimIds, members) {
        this.groupId = groupId;
        this.groupName = groupName;
        this.ownerXuid = ownerXuid;
        this.claimIds = claimIds;
        this.members = members;
    }
    static fromData(data) {
        let memberData = {};
        const xuids = Object.keys(data.members);
        for (const xuid of xuids) {
            const permissionData = data.members[xuid];
            const permissionKeys = Object.keys(permissionData);
            const permMap = new Map();
            for (const permission of permissionKeys) {
                const permValue = permissionData[permission];
                permMap.set(permission, permValue);
            }
            (0, claimPermissionManager_1.updatePermissions)(permMap);
            memberData[xuid] = permMap;
        }
        return new ClaimGroup(data.groupId, data.groupName, data.ownerXuid, data.claimIds, memberData);
    }
    getClaims() {
        let resClaims = [];
        const idsToRemove = [];
        for (const id of this.claimIds) {
            const claim = getClaimFromId(id);
            if (claim === undefined) {
                idsToRemove.push(id);
                continue;
            }
            resClaims.push(claim);
        }
        this.claimIds = this.claimIds.filter((value) => {
            return !idsToRemove.includes(value);
        });
        return resClaims;
    }
}
exports.ClaimGroup = ClaimGroup;
class Claim {
    constructor(owner, name, id, cornerOne, cornerTwo, dimension) {
        this.owner = owner;
        this.name = name;
        this.id = id;
        this.cornerOne = cornerOne;
        this.cornerEight = cornerTwo;
        this.dimension = dimension;
        this.members = {};
    }
    static fromData(data) {
        const claim = new Claim(data.owner, data.name, data.id, data.cornerOne, data.cornerEight, data.dimension);
        const keys = Object.keys(data);
        if (keys.includes('members')) { // Backwards compatibility, Added in an update so might not exist on data
            const memberKeys = Object.keys(data.members);
            for (const memberXuid of memberKeys) {
                const permissionData = data.members[memberXuid];
                const permissionKeys = Object.keys(permissionData);
                const permMap = new Map();
                for (const permission in permissionKeys) {
                    const permValue = permissionData[permission];
                    permMap.set(permission, permValue);
                }
                (0, claimPermissionManager_1.updatePermissions)(permMap);
                claim.members[memberXuid] = permMap;
            }
        }
        return claim;
    }
    totalBlocks() {
        return (0, utils_1.getNumOfBlocksInBox)(this.cornerOne, this.cornerEight);
    }
    tryGetGroup() {
        const ownedGroups = claimGroups.get(this.owner);
        if (ownedGroups === undefined) {
            return undefined;
        }
        for (const group of ownedGroups) {
            if (group.claimIds.includes(this.id)) {
                return group;
            }
        }
        return undefined;
    }
    getName(ignoreGroup = false) {
        if (ignoreGroup) {
            return this.name;
        }
        const group = this.tryGetGroup();
        if (group === undefined) {
            return this.name;
        }
        else {
            return group.groupName;
        }
    }
    setName(name, ignoreGroup = false) {
        if (ignoreGroup) {
            this.name = name;
            return;
        }
        const group = this.tryGetGroup();
        if (group === undefined) {
            this.name = name;
        }
        else {
            group.groupName = name;
        }
    }
    getMemberPermissions(memberXuid) {
        const group = this.tryGetGroup();
        if (group === undefined) {
            return this.members[memberXuid];
        }
        else {
            return group.members[memberXuid];
        }
    }
    getMemberXuids() {
        const group = this.tryGetGroup();
        let membersRecord;
        if (group === undefined) {
            membersRecord = this.members;
        }
        else {
            membersRecord = group.members;
        }
        return Object.keys(membersRecord);
    }
    setMemberPermissions(playerXuid, permissions) {
        let group = this.tryGetGroup();
        if (group === undefined) {
            this.members[playerXuid] = permissions;
        }
        else {
            group.members[playerXuid] = permissions;
        }
    }
    getMemberObject() {
        const group = this.tryGetGroup();
        if (group === undefined) {
            return this.members;
        }
        else {
            return group.members;
        }
    }
    removeMember(playerXuid) {
        let group = this.tryGetGroup();
        if (group === undefined) {
            delete this.members[playerXuid];
        }
        else {
            delete group.members[playerXuid];
        }
    }
}
exports.Claim = Claim;
function getOwnedGroups(playerXuid) {
    let groups = claimGroups.get(playerXuid);
    if (groups === undefined) {
        groups = [];
    }
    return groups;
}
exports.getOwnedGroups = getOwnedGroups;
function deleteClaimGroup(group) {
    let ownersGroups = claimGroups.get(group.ownerXuid);
    if (ownersGroups === undefined) {
        throw "Group not registered!";
    }
    ownersGroups = ownersGroups.filter((value) => {
        return value.groupId !== group.groupId;
    });
    claimGroups.set(group.ownerXuid, ownersGroups);
}
exports.deleteClaimGroup = deleteClaimGroup;
function registerClaimGroup(group) {
    let ownedGroups = claimGroups.get(group.ownerXuid);
    if (ownedGroups === undefined) {
        ownedGroups = [];
    }
    ownedGroups.push(group);
    claimGroups.set(group.ownerXuid, ownedGroups);
}
exports.registerClaimGroup = registerClaimGroup;
function registerServerClaim(claim) {
    let existingClaims = claimMap.get('SERVER');
    if (existingClaims === undefined) {
        existingClaims = [];
    }
    existingClaims.push(claim);
    claimMap.set('SERVER', existingClaims);
}
exports.registerServerClaim = registerServerClaim;
function registerClaim(claim) {
    let existingClaims = claimMap.get(claim.owner);
    if (existingClaims === undefined) {
        existingClaims = [];
    }
    existingClaims.push(claim);
    claimMap.set(claim.owner, existingClaims);
}
exports.registerClaim = registerClaim;
function registerNewServerClaim(name, pos1, pos2, dimensionId) {
    let { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(pos1, pos2);
    const claim = new Claim('SERVER', name, (0, utils_1.generateID)(configManager_1.CONFIG.claimIdLength), cornerOne, cornerTwo, dimensionId);
    let serverClaims = claimMap.get('SERVER');
    if (serverClaims === undefined) {
        serverClaims = [];
    }
    serverClaims.push(claim);
    claimMap.set('SERVER', serverClaims);
    return claim;
}
exports.registerNewServerClaim = registerNewServerClaim;
function registerNewClaim(ownerXuid, name, pos1, pos2, dimensionId) {
    // Creating direction consistent corners
    const { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(pos1, pos2);
    const id = (0, utils_1.generateID)(configManager_1.CONFIG.claimIdLength);
    const claim = new Claim(ownerXuid, name, id, cornerOne, cornerTwo, dimensionId);
    const res = (0, eventStorage_1.fireEvent)('ClaimCreationEvent', { ownerXuid, claim });
    if (!res) {
        // Claim creation canceled, event should have handled messaging the player. Returning unidentified to inform previous things claim wasn't made
        return undefined;
    }
    let claimList = claimMap.get(ownerXuid);
    if (claimList === undefined) {
        claimList = [];
    }
    claimList.push(claim);
    claimMap.set(ownerXuid, claimList);
    (0, storageManager_1.saveData)();
    return claim;
}
exports.registerNewClaim = registerNewClaim;
function getAllClaims() {
    const storedClaimArrays = claimMap.values();
    let claims = [];
    claims = claims.concat(...storedClaimArrays);
    return claims;
}
exports.getAllClaims = getAllClaims;
function getOwnedClaims(ownerXuid) {
    let claims = claimMap.get(ownerXuid);
    if (claims === undefined) {
        claims = [];
    }
    return claims;
}
exports.getOwnedClaims = getOwnedClaims;
function getOwnedOrMemberedClaims(playerXuid) {
    const claims = getAllClaims();
    const foundClaims = [];
    for (const claim of claims) {
        const memberPermissions = claim.getMemberPermissions(playerXuid);
        if (claim.owner === playerXuid || memberPermissions !== undefined) {
            foundClaims.push(claim);
        }
    }
    return foundClaims;
}
exports.getOwnedOrMemberedClaims = getOwnedOrMemberedClaims;
function getClaimAtPos(pos, dimension) {
    const claims = getAllClaims();
    for (const claim of claims) {
        if (claim.dimension !== dimension) {
            continue;
        }
        if ((0, utils_1.isPointInBox)(pos, claim.cornerOne, claim.cornerEight)) {
            return claim;
        }
    }
}
exports.getClaimAtPos = getClaimAtPos;
function isAnyClaimInBox(box) {
    const claims = getAllClaims();
    for (const claim of claims) {
        const claimBox = new utils_1.BoxCorners(claim.cornerOne, claim.cornerEight);
        if ((0, utils_1.isBoxOverlapping)(box, claimBox) || (0, utils_1.isBoxOverlapping)(claimBox, box)) {
            return true;
        }
    }
    return false;
}
exports.isAnyClaimInBox = isAnyClaimInBox;
function deleteClaim(claim) {
    let ownerClaims = claimMap.get(claim.owner);
    if (ownerClaims === undefined) {
        ownerClaims = [];
    }
    else {
        ownerClaims = ownerClaims.filter((value) => {
            return value.id !== claim.id;
        });
    }
    claimMap.set(claim.owner, ownerClaims);
    const freedBlocks = claim.totalBlocks();
    (0, claimBlocksManager_1.freeBlocksForPlayer)(claim.owner, freedBlocks);
    (0, storageManager_1.saveData)();
}
exports.deleteClaim = deleteClaim;
function getClaimFromId(id) {
    const values = claimMap.values();
    for (const claims of values) {
        for (const claim of claims) {
            if (claim.id === id) {
                return claim;
            }
        }
    }
}
exports.getClaimFromId = getClaimFromId;
function playerHasPerms(claim, playerXuid, permission) {
    const memberPermData = claim.getMemberPermissions(playerXuid);
    if (memberPermData === undefined) { // Not a member
        return false;
    }
    const permissionData = memberPermData.get(permission);
    if (permissionData === undefined) {
        return undefined;
    }
    return permissionData;
}
exports.playerHasPerms = playerHasPerms;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxvQ0FBc0g7QUFDdEgsb0RBQXdDO0FBR3hDLDhEQUFtRDtBQUNuRCw2REFBeUQ7QUFDekQseURBQWlEO0FBQ2pELHFFQUE0RTtBQUU1RSxNQUFNLFFBQVEsR0FBeUIsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNDQUFzQztBQUN4RixNQUFNLFdBQVcsR0FBOEIsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV6RCxNQUFhLFVBQVU7SUFPbkIsWUFBWSxPQUFlLEVBQUUsU0FBaUIsRUFBRSxTQUFpQixFQUFFLFFBQWtCLEVBQUUsT0FBd0M7UUFDM0gsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDM0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBUztRQUNyQixJQUFJLFVBQVUsR0FBb0MsRUFBRSxDQUFDO1FBQ3JELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3RCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUMsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNuRCxNQUFNLE9BQU8sR0FBb0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUMzQyxLQUFLLE1BQU0sVUFBVSxJQUFJLGNBQWMsRUFBRTtnQkFDckMsTUFB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