import {SerializableVec3} from "../SerializableTypes/SerializableVec3";
import {BoxCorners, generateID, getNumOfBlocksInBox, isBoxOverlapping, isPointInBox, organizeCorners} from "../utils";
import {CONFIG} from "../configManager";
import {VectorXYZ} from "bdsx/common";
import {DimensionId} from "bdsx/bds/actor";
import {saveData} from "../Storage/storageManager";
import {freeBlocksForPlayer} from "./claimBlocksManager";
import {fireEvent} from "../events/eventStorage";
import {ClaimPermission, updatePermissions} from "./claimPermissionManager";
import {GroupCreatedEvent} from "../events/groupCreatedEvent";

const claimMap: Map<string, Claim[]> = new Map(); // Key: OwnerXUID, value: Owned claims
const claimGroups: Map<string, ClaimGroup[]> = new Map();

export class ClaimGroup {
    groupId: string;
    groupName: string;
    ownerXuid: string;
    claimIds: string[];
    members: Record<string, ClaimPermission>;

    constructor(groupId: string, groupName: string, ownerXuid: string, claimIds: string[], members: Record<string, ClaimPermission>) {
        this.groupId = groupId;
        this.groupName = groupName;
        this.ownerXuid = ownerXuid;
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

        return new ClaimGroup(data.groupId, data.groupName, data.ownerXuid, data.claimIds, memberData);
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

    addClaim(claim: Claim, mergePermissions: boolean = true): boolean {
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

export class Claim {
    owner: string; // XUID
    private name: string;
    id: string;
    dimension: DimensionId;
    cornerOne: SerializableVec3; // Lowest X, Y, and Z
    cornerEight: SerializableVec3; // Highest X, Y, and Z
    private readonly members: Record<string, ClaimPermission>;

    constructor(owner: string, name: string, id: string, cornerOne: SerializableVec3, cornerTwo: SerializableVec3, dimension: DimensionId) {
        this.owner = owner;
        this.name = name;
        this.id = id;
        this.cornerOne = cornerOne;
        this.cornerEight = cornerTwo;
        this.dimension = dimension;
        this.members = {};
    }

    static fromData(data: any) {
        const claim = new Claim(data.owner, data.name, data.id, data.cornerOne, data.cornerEight, data.dimension);
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

    getMemberXuids() {
        const group = this.tryGetGroup();
        let membersRecord;
        if (group === undefined) {
            membersRecord = this.members;
        } else {
            membersRecord = group.members;
        }

        return Object.keys(membersRecord);
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
            delete this.members[playerXuid];
        } else {
            delete group.members[playerXuid];
        }
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

export function deleteClaimGroup(group: ClaimGroup) {
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

    const group = new ClaimGroup(id, groupName, ownerXuid, [], {});

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

    existingClaims.push(claim);

    claimMap.set(claim.owner, existingClaims);
}

export function registerNewServerClaim(name: string, pos1: SerializableVec3, pos2: SerializableVec3, dimensionId: DimensionId) {
    let {cornerOne, cornerTwo} = organizeCorners(pos1, pos2);

    const claim = new Claim('SERVER', name, generateID(CONFIG.claimIdLength), cornerOne, cornerTwo, dimensionId);

    let serverClaims = claimMap.get('SERVER');
    if (serverClaims === undefined) {
        serverClaims = [];
    }

    serverClaims.push(claim);

    claimMap.set('SERVER', serverClaims);

    return claim;
}

export async function registerNewClaim(ownerXuid: string, name: string, pos1: SerializableVec3, pos2: SerializableVec3, dimensionId: DimensionId) {
    // Creating direction consistent corners
    const {cornerOne, cornerTwo} = organizeCorners(pos1, pos2);

    const id = generateID(CONFIG.claimIdLength);

    const claim = new Claim(ownerXuid, name, id, cornerOne, cornerTwo, dimensionId);

    const eventRes = fireEvent('ClaimCreationEvent', {claim, ownerXuid});
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

    let claimList = claimMap.get(ownerXuid);
    if (claimList === undefined) {
        claimList = [];
    }

    claimList.push(claim);
    claimMap.set(ownerXuid, claimList);

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

export function getOwnedClaims(ownerXuid: string) {
    let claims = claimMap.get(ownerXuid);
    if (claims === undefined) {
        claims = [];
    }

    return claims;
}

export function getOwnedOrMemberedClaims(playerXuid: string) {
    const claims = getAllClaims();
    const foundClaims: Claim[] = [];

    for (const claim of claims) {
        const memberPermissions = claim.getMemberPermissions(playerXuid);
        if (claim.owner === playerXuid || memberPermissions !== undefined) {
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

export function isAnyClaimInBox(box: BoxCorners) {
    const claims = getAllClaims();

    for (const claim of claims) {
        const claimBox = new BoxCorners(claim.cornerOne, claim.cornerEight);

        if (isBoxOverlapping(box, claimBox) || isBoxOverlapping(claimBox, box)) {
            return true
        }
    }

    return false;
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

export function playerHasPerms(claim: Claim, playerXuid: string, permission: string) {
    if (claim.owner === playerXuid) {
        return true;
    }

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
