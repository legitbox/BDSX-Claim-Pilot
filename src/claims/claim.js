"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClaimFromId = exports.deleteClaim = exports.isAnyClaimInBox = exports.getClaimAtPos = exports.getOwnedClaims = exports.getAllClaims = exports.registerNewClaim = exports.registerNewServerClaim = exports.registerClaim = exports.registerServerClaim = exports.Claim = void 0;
const utils_1 = require("../utils");
const configManager_1 = require("../configManager");
const storageManager_1 = require("../Storage/storageManager");
const claimBlocksManager_1 = require("./claimBlocksManager");
const eventStorage_1 = require("../events/eventStorage");
const claimMap = new Map(); // Key: OwnerXUID, value: Owned claims
class Claim {
    constructor(owner, name, id, cornerOne, cornerTwo, dimension) {
        this.owner = owner;
        this.name = name;
        this.id = id;
        this.cornerOne = cornerOne;
        this.cornerEight = cornerTwo;
        this.dimension = dimension;
    }
    static fromData(data) {
        return new Claim(data.owner, data.name, data.id, data.cornerOne, data.cornerEight, data.dimension);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxvQ0FBc0g7QUFDdEgsb0RBQXdDO0FBR3hDLDhEQUFtRDtBQUNuRCw2REFBeUQ7QUFDekQseURBQWlEO0FBRWpELE1BQU0sUUFBUSxHQUF5QixJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsc0NBQXNDO0FBRXhGLE1BQWEsS0FBSztJQVFkLFlBQVksS0FBYSxFQUFFLElBQVksRUFBRSxFQUFVLEVBQUUsU0FBMkIsRUFBRSxTQUEyQixFQUFFLFNBQXNCO1FBQ2pJLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBUztRQUNyQixPQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkcsQ0FBQztJQUVELFdBQVc7UUFDUCxPQUFPLElBQUEsMkJBQW1CLEVBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDakUsQ0FBQztDQUNKO0FBeEJELHNCQXdCQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLEtBQVk7SUFDNUMsSUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFR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