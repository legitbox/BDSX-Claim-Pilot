import {SerializableVec3} from "../SerializableTypes/SerializableVec3";
import {BoxCorners, generateID, getNumOfBlocksInBox, getOfflinePlayerOp, isPointInBox, organizeCorners} from "../utils";
import {CONFIG} from "../configManager";
import {VectorXYZ} from "bdsx/common";
import {DimensionId} from "bdsx/bds/actor";
import {saveData, updateNativeStorage} from "../Storage/storageManager";
import {freeBlocksForPlayer} from "./claimBlocksManager";
import {fireEvent} from "../events/eventStorage";
import {ClaimPermission, getPermData, updatePermissions} from "./claimPermissionManager";
import {GroupCreatedEvent} from "../events/groupCreatedEvent";
import {Vec3} from "bdsx/bds/blockpos";
import {checkIfBoxOverlapsAnyClaim} from "../Native/dllManager";
import {ClaimCreationEvent} from "../events/claimCreatedEvent";

const claimMap: Map<string, Claim[]> = new Map(); // Key: OwnerXUID, value: Owned claims
const claimGroups: Map<string, ClaimGroup[]> = new Map();

export class ClaimGroup {
    groupId: string;
    groupName: string;
    ownerXuid: string;
    coOwners: string[];
    claimIds: string[];
    members: Record<string, ClaimPermission>;

    constructor(groupId: string, groupName: string, ownerXuid: string, coOwners: string[], claimIds: string[], members: Record<string, ClaimPermission>) {
        this.groupId = groupId;
        this.groupName = groupName;
        this.ownerXuid = ownerXuid;
        this.coOwners = coOwners;
        this.claimIds = claimIds;
        this.members = members;
    }

    static fromData(data: any) {
        let memberData: Record<string, ClaimPermission> = {};
        const xuids = Object.keys(data.members);
        for (const xuid of xuids) {
            const permissionData = data.members[xuid];
            const permissionKeys = Object.keys(permissionData);
            const permMap: ClaimPermission = new Map();
            for (const permission of permissionKeys) {
                const permValue = permissionData[permission];
                permMap.set(permission, permValue);
            }

            updatePermissions(permMap);

            memberData[xuid] = permMap;
        }

        return new ClaimGroup(data.groupId, data.groupName, data.ownerXuid, data.coOwners, data.claimIds, memberData);
    }

    getClaims() {
        let resClaims: Claim[] = [];
        const idsToRemove: string[] = [];
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
        })

        return resClaims;
    }

    removeClaim(claim: Claim) {
        this.claimIds = this.claimIds.filter((value) => {
            return value !== claim.id;
        })
    }

    addClaim(claim: Claim, mergePermissions: boolean = true): boolean {
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

    setName(name: string) {
        this.groupName = name;
    }

    getName() {
        return this.groupName;
    }

    getMemberPermissions(xuid: string) {
        return this.members[xuid];
    }

    getMemberXuids(): string[] {
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

    isCoOwner(xuid: string) {
        return this.coOwners.includes(xuid);
    }

    addCoOwner(xuid: string) {
        if (!this.coOwners.includes(xuid)) {
            this.coOwners.push(xuid);
        }
    }

    removeCoOwner(xuid: string) {
        this.coOwners = this.coOwners.filter((value) => {
            return value !== xuid;
        });
    }

    removeMember(xuid: string) {
        if (this.isCoOwner(xuid)) {
            this.removeCoOwner(xuid);
        }

        delete this.members[xuid];
    }

    setMemberPermissions(playerXuid: string, permissions: ClaimPermission) {
        this.members[playerXuid] = permissions;
    }
}

export class Claim {
    owner: string; // XUID
    coOwners: string[];
    private name: string;
    id: string;
    dimension: DimensionId;
    cornerOne: SerializableVec3; // Lowest X, Y, and Z
    cornerEight: SerializableVec3; // Highest X, Y, and Z
    private members: Record<string, ClaimPermission>;

    constructor(owner: string, coOwners: string[], name: string, id: string, cornerOne: SerializableVec3, cornerTwo: SerializableVec3, dimension: DimensionId) {
        this.owner = owner;
        this.coOwners = coOwners;
        this.name = name;
        this.id = id;
        this.cornerOne = cornerOne;
        this.cornerEight = cornerTwo;
        this.dimension = dimension;
        this.members = {};
    }

    static fromData(data: any) {
        const claim = new Claim(data.owner, data.coOwners, data.name, data.id, data.cornerOne, data.cornerEight, data.dimension);
        const keys = Object.keys(data);

        if (keys.includes('members')) { // Backwards compatibility, Added in an update so might not exist on data
            const memberKeys = Object.keys(data.members);

            for (const memberXuid of memberKeys) {
                const permissionData = data.members[memberXuid];
                const permissionKeys = Object.keys(permissionData);
                const permMap: ClaimPermission = new Map();
                for (const permission in permissionKeys) {
                    const permValue = permissionData[permission];
                    permMap.set(permission, permValue);
                }

                updatePermissions(permMap);

                claim.members[memberXuid] = permMap;
            }
        }

        return claim;
    }

    totalBlocks() {
        return getNumOfBlocksInBox(this.cornerOne, this.cornerEight);
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

    getName(ignoreGroup: boolean = false) {
        if (ignoreGroup) {
            return this.name;
        }

        const group = this.tryGetGroup();
        if (group === undefined) {
            return this.name;
        } else {
            return group.groupName;
        }
    }

    setName(name: string, ignoreGroup: boolean = false) {
        if (ignoreGroup) {
            this.name = name;
            return;
        }

        const group = this.tryGetGroup();
        if (group === undefined) {
            this.name = name;
        } else {
            group.groupName = name;
        }
    }

    getMemberPermissions(memberXuid: string): ClaimPermission | undefined {
        const group = this.tryGetGroup();
        if (group === undefined) {
            return this.members[memberXuid];
        } else {
            return group.members[memberXuid];
        }
    }

    setMemberPerms(memberPerms: Record<string, ClaimPermission>) {
        this.members = memberPerms;
    }

    getMemberXuids() {
        const group = this.tryGetGroup();
        let membersRecord;
        let coOwners;
        if (group === undefined) {
            membersRecord = this.members;
            coOwners = this.coOwners;
        } else {
            membersRecord = group.members;
            coOwners = group.coOwners;
        }

        const members =  Object.keys(membersRecord);
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
        } else {
            return group.ownerXuid;
        }
    }

    setMemberPermissions(playerXuid: string, permissions: ClaimPermission) {
        let group = this.tryGetGroup();
        if (group === undefined) {
            this.members[playerXuid] = permissions;
        } else {
            group.members[playerXuid] = permissions;
        }
    }

    getMemberObject(ignoreGroup: boolean = false) {
        if (ignoreGroup) {
            return this.members;
        }

        const group = this.tryGetGroup();
        if (group === undefined) {
            return this.members;
        } else {
            return group.members;
        }
    }

    removeMember(playerXuid: string) {
        let group = this.tryGetGroup();
        if (group === undefined) {
            if (this.isCoOwner(playerXuid)) {
                this.removeCoOwner(playerXuid);
            }

            delete this.members[playerXuid];
        } else {
            group.removeMember(playerXuid);
        }
    }

    isCoOwner(xuid: string) {
        let group = this.tryGetGroup();
        if (group === undefined) {
            return this.coOwners.includes(xuid);
        } else {
            return group.isCoOwner(xuid);
        }
    }

    addCoOwner(xuid: string) {
        let group = this.tryGetGroup();
        if (group === undefined && !this.coOwners.includes(xuid)) {
            this.coOwners.push(xuid);
        } else if (group !== undefined) {
            group.addCoOwner(xuid);
        }
    }

    removeCoOwner(xuid: string) {
        let group = this.tryGetGroup();
        if (group === undefined) {
            this.coOwners = this.coOwners.filter((value) => {
                return value !== xuid;
            });
        } else {
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

        return new SerializableVec3({
            x: centerX,
            y: centerY,
            z: centerZ,
        });
    }
}

export function getGroupById(groupId: string) {
    const allGroups = getAllGroups();
    for (const group of allGroups) {
        if (group.groupId === groupId) {
            return group;
        }
    }

    return undefined;
}

export function getOwnedGroups(playerXuid: string) {
    let groups = claimGroups.get(playerXuid);
    if (groups === undefined) {
        groups = [];
    }

    return groups;
}

export function deleteClaimGroup(group: ClaimGroup, deleteClaims: boolean = false) {
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
    })

    claimGroups.set(group.ownerXuid, ownersGroups);
}

export interface CreateGroupOptions {
    registerGroup?: boolean,
    triggerEvent?: boolean,
    initialClaims?: Claim[],
}

function fillEmptyGroupOptions(options: CreateGroupOptions | undefined): CreateGroupOptions {
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

export enum CreateGroupRejectReason {
    Cancelled,
    BugWithClaimPilot,
}

export async function createGroup(groupName: string, ownerXuid: string, options?: CreateGroupOptions): Promise<ClaimGroup> {
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
    let id = generateID(16);
    while (existingGroupIds.includes(id)) {
        id = generateID(16);
    }

    const group = new ClaimGroup(id, groupName, ownerXuid, [], [], {});

    for (const claim of options.initialClaims) {
        group.addClaim(claim);
    }

    if (options.triggerEvent) {
        const eventRes = fireEvent(GroupCreatedEvent.ID, {
            group,
            ownerXuid,
        })

        let shouldFire;
        if (typeof eventRes === "boolean") {
            shouldFire = eventRes;
        } else {
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

export function registerClaimGroup(group: ClaimGroup) {
    let ownedGroups = claimGroups.get(group.ownerXuid);
    if (ownedGroups === undefined) {
        ownedGroups = [];
    }

    ownedGroups.push(group);

    claimGroups.set(group.ownerXuid, ownedGroups);
}

export function registerServerClaimGroup(group: ClaimGroup) {
    let ownedGroups = claimGroups.get("SERVER");
    if (ownedGroups === undefined) {
        ownedGroups = [];
    }

    ownedGroups.push(group);

    claimGroups.set("SERVER", ownedGroups);
}

export function registerServerClaim(claim: Claim) {
    let existingClaims = claimMap.get('SERVER');
    if (existingClaims === undefined) {
        existingClaims = [];
    }

    existingClaims.push(claim);

    claimMap.set('SERVER', existingClaims);
}

export function registerClaim(claim: Claim) {
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

export async function registerNewServerClaim(name: string, pos1: SerializableVec3, pos2: SerializableVec3, dimensionId: DimensionId, creatorXuid: string) {
    let {cornerOne, cornerTwo} = organizeCorners(pos1, pos2);

    const claim = new Claim('SERVER', [], name, generateID(CONFIG.claimIdLength), cornerOne, cornerTwo, dimensionId);

    const res = fireEvent(ClaimCreationEvent.ID, {claim, creatorXuid});
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

export async function registerNewClaim(creatorXuid: string, name: string, pos1: SerializableVec3, pos2: SerializableVec3, dimensionId: DimensionId) {
    // Creating direction consistent corners
    const {cornerOne, cornerTwo} = organizeCorners(pos1, pos2);

    const id = generateID(CONFIG.claimIdLength);

    const claim = new Claim(creatorXuid, [], name, id, cornerOne, cornerTwo, dimensionId);

    const eventRes = fireEvent('ClaimCreationEvent', {claim, creatorXuid});
    let res;
    if (typeof eventRes === "boolean") {
        res = eventRes;
    } else {
        res = await eventRes;
    }

    if (!res) {
        // Claim creation canceled, event should have handled messaging the player. Returning unidentified to inform previous things claim wasn't made
        return undefined;
    }

    registerClaim(claim);

    saveData();

    return claim;
}

export function getAllGroups() {
    let retGroups: ClaimGroup[] = [];
    for (const playerGroups of claimGroups.values()) {
        retGroups = retGroups.concat(playerGroups);
    }

    return retGroups;
}

export function getAllGroupIds() {
    const groups = getAllGroups();

    const groupIds: string[] = [];
    for (const group of groups) {
        groupIds.push(group.groupId);
    }

    return groupIds;
}

export function getAllClaims() {
    const storedClaimArrays = claimMap.values();
    let claims: Claim[] = [];
    claims = claims.concat(...storedClaimArrays);

    return claims;
}

export function getAllNonGroupedClaims() {
    const claims = getAllClaims();
    const foundClaims: Claim[] = [];

    for (const claim of claims) {
        if (!claim.isInGroup()) {
            foundClaims.push(claim);
        }
    }

    return foundClaims;
}

export function getOwnedClaims(ownerXuid: string, canBeInGroup: boolean = true) {
    let claims = claimMap.get(ownerXuid);
    if (claims === undefined) {
        claims = [];
    }

    if (!canBeInGroup) {
        claims = claims.filter((value) => {
            return !value.isInGroup();
        })
    }

    return claims;
}

export function getEditableGroups(playerXuid: string) {
    let groups = getAllGroups();

    const foundGroups: ClaimGroup[] = [];

    for (const group of groups) {
        if (getPlayerPermissionState(group, playerXuid, "edit_name")) {
            foundGroups.push(group);
        }
    }

    return foundGroups;
}

// Checks if player is Owner, Co-Owner, or has the ability to Edit Names
export function getEditableClaims(playerXuid: string, canBeInGroup: boolean = true) {
    let claims;
    if (canBeInGroup) {
        claims = getAllClaims();
    } else {
        claims = getAllNonGroupedClaims()
    }

    const foundClaims: Claim[] = [];

    for (const claim of claims) {
        if (claim.getOwner() === playerXuid || claim.isCoOwner(playerXuid) || getPlayerPermissionState(claim, playerXuid, "edit_name")) {
            foundClaims.push(claim);
        }
    }

    return foundClaims;
}

export function getOwnedOrMemberedClaims(playerXuid: string) {
    const claims = getAllClaims();
    const foundClaims: Claim[] = [];

    for (const claim of claims) {
        const memberPermissions = claim.getMemberPermissions(playerXuid);
        if (claim.getOwner() === playerXuid || memberPermissions !== undefined || claim.isCoOwner(playerXuid)) {
            foundClaims.push(claim);
        }
    }

    return foundClaims;
}

export function getClaimAtPos(pos: VectorXYZ, dimension: DimensionId) {
    const claims = getAllClaims();

    for (const claim of claims) {
        if (claim.dimension !== dimension) {
            continue;
        }

        if (isPointInBox(pos, claim.cornerOne, claim.cornerEight)) {
            return claim;
        }
    }
}

export function isAnyClaimInBox(box: BoxCorners, dimensionId: DimensionId) {
    updateNativeStorage();

    const cornerOne = Vec3.create(box.bottom.cornerOne);
    const cornerEight = Vec3.create(box.top.cornerFour);

    return checkIfBoxOverlapsAnyClaim(
        cornerOne,
        cornerEight,
        dimensionId
    );
}

export function deleteClaim(claim: Claim) {
    let ownerClaims = claimMap.get(claim.owner);
    if (ownerClaims === undefined) {
        ownerClaims = [];
    } else {
        ownerClaims = ownerClaims.filter((value) => {
            return value.id !== claim.id;
        })
    }

    claimMap.set(claim.owner, ownerClaims);

    const freedBlocks = claim.totalBlocks();

    freeBlocksForPlayer(claim.owner, freedBlocks);

    const group = claim.tryGetGroup();
    if (group !== undefined) {
        group.claimIds = group.claimIds.filter((value) => {
            return value !== claim.id;
        });
    }

    saveData();
}

export function getClaimFromId(id: string) {
    const values = claimMap.values();
    for (const claims of values) {
        for (const claim of claims) {
            if (claim.id === id) {
                return claim;
            }
        }
    }
}

export function getPlayerPermissionState(claim: Claim | ClaimGroup, playerXuid: string, permission: string) {
    const permData = getPermData(permission);
    if (permData === undefined) {
        return false;
    }

    if (claim.getOwner() === playerXuid || claim.isCoOwner(playerXuid) || getOfflinePlayerOp(playerXuid)) {
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
