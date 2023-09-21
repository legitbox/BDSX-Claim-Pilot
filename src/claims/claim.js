"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerPermissionState = exports.getClaimFromId = exports.deleteClaim = exports.isAnyClaimInBox = exports.getClaimAtPos = exports.getOwnedOrMemberedClaims = exports.getEditableClaims = exports.getEditableGroups = exports.getOwnedClaims = exports.getAllNonGroupedClaims = exports.getAllClaims = exports.getAllGroupIds = exports.getAllGroups = exports.registerNewClaim = exports.registerNewServerClaim = exports.registerClaim = exports.registerServerClaim = exports.registerServerClaimGroup = exports.registerClaimGroup = exports.createGroup = exports.CreateGroupRejectReason = exports.deleteClaimGroup = exports.getOwnedGroups = exports.getGroupById = exports.Claim = exports.ClaimGroup = void 0;
const SerializableVec3_1 = require("../SerializableTypes/SerializableVec3");
const utils_1 = require("../utils");
const configManager_1 = require("../configManager");
const storageManager_1 = require("../Storage/storageManager");
const claimBlocksManager_1 = require("./claimBlocksManager");
const eventStorage_1 = require("../events/eventStorage");
const claimPermissionManager_1 = require("./claimPermissionManager");
const groupCreatedEvent_1 = require("../events/groupCreatedEvent");
const blockpos_1 = require("bdsx/bds/blockpos");
const dllManager_1 = require("../Native/dllManager");
const claimCreatedEvent_1 = require("../events/claimCreatedEvent");
const claimMap = new Map(); // Key: OwnerXUID, value: Owned claims
const claimGroups = new Map();
class ClaimGroup {
    constructor(groupId, groupName, ownerXuid, coOwners, claimIds, members) {
        this.groupId = groupId;
        this.groupName = groupName;
        this.ownerXuid = ownerXuid;
        this.coOwners = coOwners;
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
        return new ClaimGroup(data.groupId, data.groupName, data.ownerXuid, data.coOwners, data.claimIds, memberData);
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
    removeClaim(claim) {
        this.claimIds = this.claimIds.filter((value) => {
            return value !== claim.id;
        });
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
            for (const coOwnerXuid of claim.coOwners) {
                if (!this.coOwners.includes(coOwnerXuid)) {
                    this.coOwners.push(coOwnerXuid);
                }
            }
            for (const memberXuid of claimMemberXuids) {
                if (existingMemberData[memberXuid] === undefined) {
                    existingMemberData[memberXuid] = claimMemberData[memberXuid];
                }
            }
        }
        return true;
    }
    setName(name) {
        this.groupName = name;
    }
    getName() {
        return this.groupName;
    }
    getMemberPermissions(xuid) {
        return this.members[xuid];
    }
    getMemberXuids() {
        const memberXuids = Object.keys(this.members);
        for (const coOwnerXuid of this.coOwners) {
            if (!memberXuids.includes(coOwnerXuid)) {
                memberXuids.push(coOwnerXuid);
            }
        }
        return memberXuids;
    }
    getOwner() {
        return this.ownerXuid;
    }
    isCoOwner(xuid) {
        return this.coOwners.includes(xuid);
    }
    addCoOwner(xuid) {
        if (!this.coOwners.includes(xuid)) {
            this.coOwners.push(xuid);
        }
    }
    removeCoOwner(xuid) {
        this.coOwners = this.coOwners.filter((value) => {
            return value !== xuid;
        });
    }
    removeMember(xuid) {
        if (this.isCoOwner(xuid)) {
            this.removeCoOwner(xuid);
        }
        delete this.members[xuid];
    }
    setMemberPermissions(playerXuid, permissions) {
        this.members[playerXuid] = permissions;
    }
}
exports.ClaimGroup = ClaimGroup;
class Claim {
    constructor(owner, coOwners, name, id, cornerOne, cornerTwo, dimension) {
        this.owner = owner;
        this.coOwners = coOwners;
        this.name = name;
        this.id = id;
        this.cornerOne = cornerOne;
        this.cornerEight = cornerTwo;
        this.dimension = dimension;
        this.members = {};
    }
    static fromData(data) {
        const claim = new Claim(data.owner, data.coOwners, data.name, data.id, data.cornerOne, data.cornerEight, data.dimension);
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
    isInGroup() {
        const group = this.tryGetGroup();
        return group !== undefined;
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
    setMemberPerms(memberPerms) {
        this.members = memberPerms;
    }
    getMemberXuids() {
        const group = this.tryGetGroup();
        let membersRecord;
        let coOwners;
        if (group === undefined) {
            membersRecord = this.members;
            coOwners = this.coOwners;
        }
        else {
            membersRecord = group.members;
            coOwners = group.coOwners;
        }
        const members = Object.keys(membersRecord);
        for (const coOwnerXuid of coOwners) {
            if (!members.includes(coOwnerXuid)) {
                members.push(coOwnerXuid);
            }
        }
        return members;
    }
    getOwner() {
        const group = this.tryGetGroup();
        if (group === undefined) {
            return this.owner;
        }
        else {
            return group.ownerXuid;
        }
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
            if (this.isCoOwner(playerXuid)) {
                this.removeCoOwner(playerXuid);
            }
            delete this.members[playerXuid];
        }
        else {
            group.removeMember(playerXuid);
        }
    }
    isCoOwner(xuid) {
        let group = this.tryGetGroup();
        if (group === undefined) {
            return this.coOwners.includes(xuid);
        }
        else {
            return group.isCoOwner(xuid);
        }
    }
    addCoOwner(xuid) {
        let group = this.tryGetGroup();
        if (group === undefined && !this.coOwners.includes(xuid)) {
            this.coOwners.push(xuid);
        }
        else if (group !== undefined) {
            group.addCoOwner(xuid);
        }
    }
    removeCoOwner(xuid) {
        let group = this.tryGetGroup();
        if (group === undefined) {
            this.coOwners = this.coOwners.filter((value) => {
                return value !== xuid;
            });
        }
        else {
            group.removeCoOwner(xuid);
        }
    }
    getCenterPoint() {
        let length = this.cornerEight.x - this.cornerOne.x;
        let width = this.cornerEight.z - this.cornerOne.z;
        let height = this.cornerEight.y - this.cornerOne.y;
        let centerX = this.cornerOne.x + (length / 2);
        let centerZ = this.cornerOne.z + (width / 2);
        let centerY = this.cornerOne.y + (height / 2);
        return new SerializableVec3_1.SerializableVec3({
            x: centerX,
            y: centerY,
            z: centerZ,
        });
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
function deleteClaimGroup(group, deleteClaims = false) {
    const claims = group.getClaims();
    for (const claim of claims) {
        if (deleteClaims) {
            deleteClaim(claim);
            continue;
        }
        claim.owner = group.ownerXuid;
        claim.setMemberPerms(group.members);
        claim.coOwners = group.coOwners;
    }
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
    const group = new ClaimGroup(id, groupName, ownerXuid, [], [], {});
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
    const allClaims = getAllClaims();
    for (const checkingClaim of allClaims) {
        if (checkingClaim.id === claim.id) {
            throw "ERROR: CANT REGISTER CLAIM WITH SAME ID AS ALREADY REGISTERED CLAIM";
        }
    }
    existingClaims.push(claim);
    claimMap.set(claim.owner, existingClaims);
}
exports.registerClaim = registerClaim;
async function registerNewServerClaim(name, pos1, pos2, dimensionId, creatorXuid) {
    let { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(pos1, pos2);
    const claim = new Claim('SERVER', [], name, (0, utils_1.generateID)(configManager_1.CONFIG.claimIdLength), cornerOne, cornerTwo, dimensionId);
    const res = (0, eventStorage_1.fireEvent)(claimCreatedEvent_1.ClaimCreationEvent.ID, { claim, creatorXuid });
    if (res instanceof Promise) {
        await res;
    }
    if (!res) {
        return undefined;
    }
    let serverClaims = claimMap.get('SERVER');
    if (serverClaims === undefined) {
        serverClaims = [];
    }
    serverClaims.push(claim);
    claimMap.set('SERVER', serverClaims);
    return claim;
}
exports.registerNewServerClaim = registerNewServerClaim;
async function registerNewClaim(creatorXuid, name, pos1, pos2, dimensionId) {
    // Creating direction consistent corners
    const { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(pos1, pos2);
    const id = (0, utils_1.generateID)(configManager_1.CONFIG.claimIdLength);
    const claim = new Claim(creatorXuid, [], name, id, cornerOne, cornerTwo, dimensionId);
    const eventRes = (0, eventStorage_1.fireEvent)('ClaimCreationEvent', { claim, creatorXuid });
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
    registerClaim(claim);
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
function getAllNonGroupedClaims() {
    const claims = getAllClaims();
    const foundClaims = [];
    for (const claim of claims) {
        if (!claim.isInGroup()) {
            foundClaims.push(claim);
        }
    }
    return foundClaims;
}
exports.getAllNonGroupedClaims = getAllNonGroupedClaims;
function getOwnedClaims(ownerXuid, canBeInGroup = true) {
    let claims = claimMap.get(ownerXuid);
    if (claims === undefined) {
        claims = [];
    }
    if (!canBeInGroup) {
        claims = claims.filter((value) => {
            return !value.isInGroup();
        });
    }
    return claims;
}
exports.getOwnedClaims = getOwnedClaims;
function getEditableGroups(playerXuid) {
    let groups = getAllGroups();
    const foundGroups = [];
    for (const group of groups) {
        if (getPlayerPermissionState(group, playerXuid, "edit_name")) {
            foundGroups.push(group);
        }
    }
    return foundGroups;
}
exports.getEditableGroups = getEditableGroups;
// Checks if player is Owner, Co-Owner, or has the ability to Edit Names
function getEditableClaims(playerXuid, canBeInGroup = true) {
    let claims;
    if (canBeInGroup) {
        claims = getAllClaims();
    }
    else {
        claims = getAllNonGroupedClaims();
    }
    const foundClaims = [];
    for (const claim of claims) {
        if (claim.getOwner() === playerXuid || claim.isCoOwner(playerXuid) || getPlayerPermissionState(claim, playerXuid, "edit_name")) {
            foundClaims.push(claim);
        }
    }
    return foundClaims;
}
exports.getEditableClaims = getEditableClaims;
function getOwnedOrMemberedClaims(playerXuid) {
    const claims = getAllClaims();
    const foundClaims = [];
    for (const claim of claims) {
        const memberPermissions = claim.getMemberPermissions(playerXuid);
        if (claim.getOwner() === playerXuid || memberPermissions !== undefined || claim.isCoOwner(playerXuid)) {
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
function isAnyClaimInBox(box, dimensionId) {
    (0, storageManager_1.updateNativeStorage)();
    const cornerOne = blockpos_1.Vec3.create(box.bottom.cornerOne);
    const cornerEight = blockpos_1.Vec3.create(box.top.cornerFour);
    return (0, dllManager_1.checkIfBoxOverlapsAnyClaim)(cornerOne, cornerEight, dimensionId);
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
function getPlayerPermissionState(claim, playerXuid, permission) {
    const permData = (0, claimPermissionManager_1.getPermData)(permission);
    if (permData === undefined) {
        return false;
    }
    if (claim.getOwner() === playerXuid || claim.isCoOwner(playerXuid) || (0, utils_1.getOfflinePlayerOp)(playerXuid)) {
        return true;
    }
    if (permData.onlyCoOwner) {
        return false;
    }
    const memberPermData = claim.getMemberPermissions(playerXuid);
    if (memberPermData === undefined) { // Not Owner, CoOwner, or Member
        return false;
    }
    const permissionData = memberPermData.get(permission);
    if (permissionData === undefined) {
        return false;
    }
    return permissionData;
}
exports.getPlayerPermissionState = getPlayerPermissionState;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0RUFBdUU7QUFDdkUsb0NBQXdIO0FBQ3hILG9EQUF3QztBQUd4Qyw4REFBd0U7QUFDeEUsNkRBQXlEO0FBQ3pELHlEQUFpRDtBQUNqRCxxRUFBeUY7QUFDekYsbUVBQThEO0FBQzlELGdEQUF1QztBQUN2QyxxREFBZ0U7QUFDaEUsbUVBQStEO0FBRS9ELE1BQU0sUUFBUSxHQUF5QixJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0NBQXNDO0FBQ3hGLE1BQU0sV0FBVyxHQUE4QixJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRXpELE1BQWEsVUFBVTtJQVFuQixZQUFZLE9BQWUsRUFBRSxTQUFpQixFQUFFLFNBQWlCLEVBQUUsUUFBa0IsRUFBRSxRQUFrQixFQUFFLE9BQXdDO1FBQy9JLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzNCLENBQUM7SUFFRCxNQUFNLENBQUMsUUFBUSxDQUFDLElBQVM7UUFDckIsSUFBSSxVQUFVLEdBQW9DLEVBQUUsQ0FBQztRQUNyRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN0QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxJ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