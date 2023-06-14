"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerHasPerms = exports.ClaimPermissionTypes = exports.getClaimFromId = exports.deleteClaim = exports.isAnyClaimInBox = exports.getClaimAtPos = exports.getOwnedOrMemberedClaims = exports.getOwnedClaims = exports.getAllClaims = exports.registerNewClaim = exports.registerNewServerClaim = exports.registerClaim = exports.registerServerClaim = exports.Claim = exports.createDefaultClaimPermission = void 0;
const utils_1 = require("../utils");
const configManager_1 = require("../configManager");
const storageManager_1 = require("../Storage/storageManager");
const claimBlocksManager_1 = require("./claimBlocksManager");
const eventStorage_1 = require("../events/eventStorage");
const claimMap = new Map(); // Key: OwnerXUID, value: Owned claims
function createDefaultClaimPermission() {
    return {
        canAddPlayers: false,
    };
}
exports.createDefaultClaimPermission = createDefaultClaimPermission;
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
            claim.members = data.members;
        }
        return claim;
    }
    totalBlocks() {
        return (0, utils_1.getNumOfBlocksInBox)(this.cornerOne, this.cornerEight);
    }
}
exports.Claim = Claim;
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
        if (claim.owner === playerXuid || claim.members[playerXuid] !== undefined) {
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
var ClaimPermissionTypes;
(function (ClaimPermissionTypes) {
    ClaimPermissionTypes[ClaimPermissionTypes["EditMembers"] = 0] = "EditMembers";
})(ClaimPermissionTypes = exports.ClaimPermissionTypes || (exports.ClaimPermissionTypes = {}));
function playerHasPerms(claim, playerXuid, permission) {
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
exports.playerHasPerms = playerHasPerms;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxvQ0FBc0g7QUFDdEgsb0RBQXdDO0FBR3hDLDhEQUFtRDtBQUNuRCw2REFBeUQ7QUFDekQseURBQWlEO0FBRWpELE1BQU0sUUFBUSxHQUF5QixJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0NBQXNDO0FBTXhGLFNBQWdCLDRCQUE0QjtJQUN4QyxPQUFPO1FBQ0gsYUFBYSxFQUFFLEtBQUs7S0FDdkIsQ0FBQTtBQUNMLENBQUM7QUFKRCxvRUFJQztBQUVELE1BQWEsS0FBSztJQVNkLFlBQVksS0FBYSxFQUFFLElBQVksRUFBRSxFQUFVLEVBQUUsU0FBMkIsRUFBRSxTQUEyQixFQUFFLFNBQXNCO1FBQ2pJLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBUztRQUNyQixNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFHLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFL0IsSUFBSSxJ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