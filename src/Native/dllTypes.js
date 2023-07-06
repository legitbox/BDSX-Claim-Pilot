"use strict";
var NativeClaimObject_1, NativePlayerObject_1, NativeStorageObject_1, NativeConfigObject_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeConfigObject = exports.NativeStorageObject = exports.NativePlayerObject = exports.NativeClaimObject = void 0;
const tslib_1 = require("tslib");
const nativeclass_1 = require("bdsx/nativeclass");
const nativetype_1 = require("bdsx/nativetype");
const blockpos_1 = require("bdsx/bds/blockpos");
const cxxvector_1 = require("bdsx/cxxvector");
const configManager_1 = require("../configManager");
const storageManager_1 = require("../Storage/storageManager");
let NativeClaimObject = NativeClaimObject_1 = class NativeClaimObject extends nativeclass_1.NativeClass {
    static uglyConstruct(dimensionId, cornerOne, cornerEight, claimId) {
        const inst = NativeClaimObject_1.allocate();
        inst.dimensionId = dimensionId;
        inst.cornerOne.construct(cornerOne);
        inst.cornerEight.construct(cornerEight);
        inst.claimId = claimId;
        return inst;
    }
};
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(nativetype_1.int32_t)
], NativeClaimObject.prototype, "dimensionId", void 0);
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(blockpos_1.Vec3)
], NativeClaimObject.prototype, "cornerOne", void 0);
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(blockpos_1.Vec3)
], NativeClaimObject.prototype, "cornerEight", void 0);
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(nativetype_1.CxxString)
], NativeClaimObject.prototype, "claimId", void 0);
NativeClaimObject = NativeClaimObject_1 = tslib_1.__decorate([
    (0, nativeclass_1.nativeClass)()
], NativeClaimObject);
exports.NativeClaimObject = NativeClaimObject;
let NativePlayerObject = NativePlayerObject_1 = class NativePlayerObject extends nativeclass_1.NativeClass {
    static uglyConstruct(xuid, claims) {
        const inst = NativePlayerObject_1.construct();
        inst.xuid = xuid;
        inst.claims.construct();
        for (const claim of claims) {
            const claimInst = NativeClaimObject.uglyConstruct(claim.dimension, blockpos_1.Vec3.create(claim.cornerOne), blockpos_1.Vec3.create(claim.cornerEight), claim.id);
            inst.claims.push(claimInst);
        }
        return inst;
    }
};
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(nativetype_1.CxxString)
], NativePlayerObject.prototype, "xuid", void 0);
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(cxxvector_1.CxxVector.make(NativeClaimObject))
], NativePlayerObject.prototype, "claims", void 0);
NativePlayerObject = NativePlayerObject_1 = tslib_1.__decorate([
    (0, nativeclass_1.nativeClass)()
], NativePlayerObject);
exports.NativePlayerObject = NativePlayerObject;
let NativeStorageObject = NativeStorageObject_1 = class NativeStorageObject extends nativeclass_1.NativeClass {
    static uglyConstruct(storage) {
        const inst = NativeStorageObject_1.allocate();
        inst.players.construct();
        const xuids = Object.keys(storage);
        for (const xuid of xuids) {
            if (storageManager_1.NON_XUID_STORAGE.includes(xuid)) {
                continue;
            }
            const playerInfo = storage[xuid];
            const playerInst = NativePlayerObject.uglyConstruct(xuid, playerInfo.claims);
            inst.players.push(playerInst);
        }
        return inst;
    }
};
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(cxxvector_1.CxxVector.make(NativePlayerObject))
], NativeStorageObject.prototype, "players", void 0);
NativeStorageObject = NativeStorageObject_1 = tslib_1.__decorate([
    (0, nativeclass_1.nativeClass)()
], NativeStorageObject);
exports.NativeStorageObject = NativeStorageObject;
let NativeConfigObject = NativeConfigObject_1 = class NativeConfigObject extends nativeclass_1.NativeClass {
    static uglyConstruct() {
        const inst = NativeConfigObject_1.allocate();
        inst.explosionsDisabled = configManager_1.CONFIG.claimDisableExplosions;
        return inst;
    }
};
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(nativetype_1.bool_t)
], NativeConfigObject.prototype, "explosionsDisabled", void 0);
NativeConfigObject = NativeConfigObject_1 = tslib_1.__decorate([
    (0, nativeclass_1.nativeClass)()
], NativeConfigObject);
exports.NativeConfigObject = NativeConfigObject;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGxsVHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkbGxUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLGtEQUF1RTtBQUN2RSxnREFBMkQ7QUFFM0QsZ0RBQXVDO0FBQ3ZDLDhDQUF5QztBQUV6QyxvREFBd0M7QUFDeEMsOERBQTJEO0FBR3BELElBQU0saUJBQWlCLHlCQUF2QixNQUFNLGlCQUFrQixTQUFRLHlCQUFXO0lBVTlDLE1BQU0sQ0FBQyxhQUFhLENBQUMsV0FBd0IsRUFBRSxTQUFlLEVBQUUsV0FBaUIsRUFBRSxPQUFlO1FBQzlGLE1BQU0sSUFBSSxHQUFHLG1CQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzFDLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBRXZCLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FDSixDQUFBO0FBakJHO0lBREMsSUFBQSx5QkFBVyxFQUFDLG9CQUFPLENBQUM7c0RBQ0k7QUFFekI7SUFEQyxJQUFBLHlCQUFXLEVBQUMsZUFBSSxDQUFDO29EQUNGO0FBRWhCO0lBREMsSUFBQSx5QkFBVyxFQUFDLGVBQUksQ0FBQztzREFDQTtBQUVsQjtJQURDLElBQUEseUJBQVcsRUFBQyxzQkFBUyxDQUFDO2tEQUNQO0FBUlAsaUJBQWlCO0lBRDdCLElBQUEseUJBQVcsR0FBRTtHQUNELGlCQUFpQixDQW1CN0I7QUFuQlksOENBQWlCO0FBc0J2QixJQUFNLGtCQUFrQiwwQkFBeEIsTUFBTSxrQkFBbUIsU0FBUSx5QkFBVztJQU0vQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQVksRUFBRSxNQUFlO1FBQzlDLE1BQU0sSUFBSSxHQUFHLG9CQUFrQixDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWpCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFeEIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDeEIsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsZUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsZUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzNJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQy9CO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztDQUNKLENBQUE7QUFqQkc7SUFEQyxJQUFBLHlCQUFXLEVBQUMsc0JBQVMsQ0FBQztnREFDVjtBQUViO0lBREMsSUFBQSx5QkFBVyxFQUFDLHFCQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7a0RBQ1Y7QUFKNUIsa0JBQWtCO0lBRDlCLElBQUEseUJBQVcsR0FBRTtHQUNELGtCQUFrQixDQW1COUI7QUFuQlksZ0RBQWtCO0FBc0J4QixJQUFNLG1CQUFtQiwyQkFBekIsTUFBTSxtQkFBb0IsU0FBUSx5QkFBVztJQUloRCxNQUFNLENBQUMsYUFBYSxDQUFDLE9BQVk7UUFDN0IsTUFBTSxJQUFJLEdBQUcscUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN6QixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25DLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3RCLElBQUksaUNBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNqQyxTQUFTO2FBQ1o7WUFFRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFakMsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0UsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDakM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0osQ0FBQTtBQXBCRztJQURDLElBQUEseUJBQVcsRUFBQyxxQkFBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29EQUNUO0FBRjlCLG1CQUFtQjtJQUQvQixJQUFBLHlCQUFXLEdBQUU7R0FDRCxtQkFBbUIsQ0FzQi9CO0FBdEJZLGtEQUFtQjtBQXlCekIsSUFBTSxrQkFBa0IsMEJBQXhCLE1BQU0sa0JBQW1CLFNBQVEseUJBQVc7SUFJL0MsTUFBTSxDQUFDLGFBQWE7UUFDaEIsTUFBTSxJQUFJLEdBQUcsb0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLGtCQUFrQixHQUFHLHNCQUFNLENBQUMsc0JBQXNCLENBQUM7UUFFeEQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztDQUNKLENBQUE7QUFSRztJQURDLElBQUEseUJBQVcsRUFBQyxtQkFBTSxDQUFDOzhEQUNRO0FBRm5CLGtCQUFrQjtJQUQ5QixJQUFBLHlCQUFXLEdBQUU7R0FDRCxrQkFBa0IsQ0FVOUI7QUFWWSxnREFBa0IifQ==