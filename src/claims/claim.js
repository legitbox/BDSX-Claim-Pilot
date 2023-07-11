"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerHasPerms = exports.getClaimFromId = exports.deleteClaim = exports.isAnyClaimInBox = exports.getClaimAtPos = exports.getOwnedOrMemberedClaims = exports.getOwnedClaims = exports.getAllClaims = exports.getAllGroupIds = exports.getAllGroups = exports.registerNewClaim = exports.registerNewServerClaim = exports.registerClaim = exports.registerServerClaim = exports.registerServerClaimGroup = exports.registerClaimGroup = exports.createGroup = exports.CreateGroupRejectReason = exports.deleteClaimGroup = exports.getOwnedGroups = exports.getGroupById = exports.Claim = exports.ClaimGroup = void 0;
const utils_1 = require("../utils");
const configManager_1 = require("../configManager");
const storageManager_1 = require("../Storage/storageManager");
const claimBlocksManager_1 = require("./claimBlocksManager");
const eventStorage_1 = require("../events/eventStorage");
const claimPermissionManager_1 = require("./claimPermissionManager");
const groupCreatedEvent_1 = require("../events/groupCreatedEvent");
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
    addClaim(claim, mergePermissions = true) {
        if (this.claimIds.includes(claim.id)) {
            return false;
        }
        this.claimIds.push(claim.id);
        if (mergePermissions) {
            const existingMemberData = this.members;
            const claimMemberData = claim.getMemberObject(true);
            const claimMemberXuids = claim.getMemberXuids();
            for (const memberXuid of claimMemberXuids) {
                if (existingMemberData[memberXuid] === undefined) {
                    existingMemberData[memberXuid] = claimMemberData[memberXuid];
                }
            }
        }
        return true;
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
    getMemberObject(ignoreGroup = false) {
        if (ignoreGroup) {
            return this.members;
        }
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
function getGroupById(groupId) {
    const allGroups = getAllGroups();
    for (const group of allGroups) {
        if (group.groupId === groupId) {
            return group;
        }
    }
    return undefined;
}
exports.getGroupById = getGroupById;
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
function fillEmptyGroupOptions(options) {
    if (options === undefined) {
        options = {};
    }
    if (options.registerGroup === undefined) {
        options.registerGroup = true;
    }
    if (options.triggerEvent === undefined) {
        options.triggerEvent = true;
    }
    if (options.initialClaims === undefined) {
        options.initialClaims = [];
    }
    return options;
}
var CreateGroupRejectReason;
(function (CreateGroupRejectReason) {
    CreateGroupRejectReason[CreateGroupRejectReason["Cancelled"] = 0] = "Cancelled";
    CreateGroupRejectReason[CreateGroupRejectReason["BugWithClaimPilot"] = 1] = "BugWithClaimPilot";
})(CreateGroupRejectReason = exports.CreateGroupRejectReason || (exports.CreateGroupRejectReason = {}));
async function createGroup(groupName, ownerXuid, options) {
    options = fillEmptyGroupOptions(options);
    if (options.initialClaims === undefined) {
        throw CreateGroupRejectReason.BugWithClaimPilot;
    }
    if (options.registerGroup === undefined) {
        throw CreateGroupRejectReason.BugWithClaimPilot;
    }
    if (options.triggerEvent === undefined) {
        throw CreateGroupRejectReason.BugWithClaimPilot;
    }
    let existingGroupIds = getAllGroupIds();
    let id = (0, utils_1.generateID)(16);
    while (existingGroupIds.includes(id)) {
        id = (0, utils_1.generateID)(16);
    }
    const group = new ClaimGroup(id, groupName, ownerXuid, [], {});
    for (const claim of options.initialClaims) {
        group.addClaim(claim);
    }
    if (options.triggerEvent) {
        const eventRes = (0, eventStorage_1.fireEvent)(groupCreatedEvent_1.GroupCreatedEvent.ID, {
            group,
            ownerXuid,
        });
        let shouldFire;
        if (typeof eventRes === "boolean") {
            shouldFire = eventRes;
        }
        else {
            shouldFire = await eventRes;
        }
        if (!shouldFire) {
            throw CreateGroupRejectReason.Cancelled;
        }
    }
    if (options.registerGroup) {
        registerClaimGroup(group);
    }
    return group;
}
exports.createGroup = createGroup;
function registerClaimGroup(group) {
    let ownedGroups = claimGroups.get(group.ownerXuid);
    if (ownedGroups === undefined) {
        ownedGroups = [];
    }
    ownedGroups.push(group);
    claimGroups.set(group.ownerXuid, ownedGroups);
}
exports.registerClaimGroup = registerClaimGroup;
function registerServerClaimGroup(group) {
    let ownedGroups = claimGroups.get("SERVER");
    if (ownedGroups === undefined) {
        ownedGroups = [];
    }
    ownedGroups.push(group);
    claimGroups.set("SERVER", ownedGroups);
}
exports.registerServerClaimGroup = registerServerClaimGroup;
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
async function registerNewClaim(ownerXuid, name, pos1, pos2, dimensionId) {
    // Creating direction consistent corners
    const { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(pos1, pos2);
    const id = (0, utils_1.generateID)(configManager_1.CONFIG.claimIdLength);
    const claim = new Claim(ownerXuid, name, id, cornerOne, cornerTwo, dimensionId);
    const eventRes = (0, eventStorage_1.fireEvent)('ClaimCreationEvent', { claim, ownerXuid });
    let res;
    if (typeof eventRes === "boolean") {
        res = eventRes;
    }
    else {
        res = await eventRes;
    }
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
function getAllGroups() {
    let retGroups = [];
    for (const playerGroups of claimGroups.values()) {
        retGroups = retGroups.concat(playerGroups);
    }
    return retGroups;
}
exports.getAllGroups = getAllGroups;
function getAllGroupIds() {
    const groups = getAllGroups();
    const groupIds = [];
    for (const group of groups) {
        groupIds.push(group.groupId);
    }
    return groupIds;
}
exports.getAllGroupIds = getAllGroupIds;
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
    const group = claim.tryGetGroup();
    if (group !== undefined) {
        group.claimIds = group.claimIds.filter((value) => {
            return value !== claim.id;
        });
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxvQ0FBc0g7QUFDdEgsb0RBQXdDO0FBR3hDLDhEQUFtRDtBQUNuRCw2REFBeUQ7QUFDekQseURBQWlEO0FBQ2pELHFFQUE0RTtBQUM1RSxtRUFBOEQ7QUFFOUQsTUFBTSxRQUFRLEdBQXlCLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxzQ0FBc0M7QUFDeEYsTUFBTSxXQUFXLEdBQThCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFekQsTUFBYSxVQUFVO0lBT25CLFlBQVksT0FBZSxFQUFFLFNBQWlCLEVBQUUsU0FBaUIsRUFBRSxRQUFrQixFQUFFLE9BQXdDO1FBQzNILElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzNCLENBQUM7SUFFRCxNQUFNLENBQUMsUUFBUSxDQUFDLElBQVM7UUFDckIsSUFBSSxVQUFVLEdBQW9DLEVBQUUsQ0FBQztRQUNyRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN0QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDbkQsTUFBTSxPQUFPLEdBQW9CLElBQUksR0FBRyxFQUFFLENBQUM7WUFDM0MsS0FBSyxNQUFNLFVBQVUsSUFBSSxjQUFjLEVB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