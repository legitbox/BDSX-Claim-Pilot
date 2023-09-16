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
function deleteClaimGroup(group) {
    const claims = group.getClaims();
    for (const claim of claims) {
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
function registerNewServerClaim(name, pos1, pos2, dimensionId) {
    let { cornerOne, cornerTwo } = (0, utils_1.organizeCorners)(pos1, pos2);
    const claim = new Claim('SERVER', [], name, (0, utils_1.generateID)(configManager_1.CONFIG.claimIdLength), cornerOne, cornerTwo, dimensionId);
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
    const claim = new Claim(ownerXuid, [], name, id, cornerOne, cornerTwo, dimensionId);
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
    if (claim.getOwner() === playerXuid || claim.isCoOwner(playerXuid)) {
        return true;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0RUFBdUU7QUFDdkUsb0NBQW9HO0FBQ3BHLG9EQUF3QztBQUd4Qyw4REFBd0U7QUFDeEUsNkRBQXlEO0FBQ3pELHlEQUFpRDtBQUNqRCxxRUFBNEU7QUFDNUUsbUVBQThEO0FBQzlELGdEQUF1QztBQUN2QyxxREFBZ0U7QUFFaEUsTUFBTSxRQUFRLEdBQXlCLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxzQ0FBc0M7QUFDeEYsTUFBTSxXQUFXLEdBQThCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFekQsTUFBYSxVQUFVO0lBUW5CLFlBQVksT0FBZSxFQUFFLFNBQWlCLEVBQUUsU0FBaUIsRUFBRSxRQUFrQixFQUFFLFFBQWtCLEVBQUUsT0FBd0M7UUFDL0ksSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDM0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBUztRQUNyQixJQUFJLFVBQVUsR0FBb0MsRUFBRSxDQUFDO1FBQ3JELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3RCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUMsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFj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