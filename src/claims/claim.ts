import {SerializableVec3} from "../SerializableTypes/SerializableVec3";
import {BoxCorners, generateID, getNumOfBlocksInBox, isBoxOverlapping, isPointInBox, organizeCorners} from "../utils";
import {CONFIG} from "../configManager";
import {VectorXYZ} from "bdsx/common";
import {DimensionId} from "bdsx/bds/actor";
import {saveData} from "../Storage/storageManager";
import {freeBlocksForPlayer} from "./claimBlocksManager";
import {fireEvent} from "../events/eventStorage";

const claimMap: Map<string, Claim[]> = new Map(); // Key: OwnerXUID, value: Owned claims

export interface ClaimPermission {
    canAddPlayers: boolean;
}

export function createDefaultClaimPermission(): ClaimPermission {
    return {
        canAddPlayers: false,
    }
}

export class Claim {
    owner: string; // XUID
    name: string;
    id: string;
    dimension: DimensionId;
    cornerOne: SerializableVec3; // Lowest X, Y, and Z
    cornerEight: SerializableVec3; // Highest X, Y, and Z
    members: Record<string, ClaimPermission>;

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
            claim.members = data.members;
        }

        return claim;
    }

    totalBlocks() {
        return getNumOfBlocksInBox(this.cornerOne, this.cornerEight);
    }
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

export function registerNewClaim(ownerXuid: string, name: string, pos1: SerializableVec3, pos2: SerializableVec3, dimensionId: DimensionId) {
    // Creating direction consistent corners
    const {cornerOne, cornerTwo} = organizeCorners(pos1, pos2);

    const id = generateID(CONFIG.claimIdLength);

    const claim = new Claim(ownerXuid, name, id, cornerOne, cornerTwo, dimensionId);

    const res = fireEvent('ClaimCreationEvent', {ownerXuid, claim});

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
        if (claim.owner === playerXuid || claim.members[playerXuid] !== undefined) {
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

export enum ClaimPermissionTypes {
    EditMembers,
}

export function playerHasPerms(claim: Claim, playerXuid: string, permission: ClaimPermissionTypes) {
    const permissionData = claim.members[playerXuid];
    if (permissionData === undefined) {
        return false;
    }

    switch (permission) {
        case ClaimPermissionTypes.EditMembers:
            return permissionData.canAddPlayers;
        default:
            return false;
    }
}