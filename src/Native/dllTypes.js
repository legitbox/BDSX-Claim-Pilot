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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGxsVHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkbGxUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLGtEQUF1RTtBQUN2RSxnREFBMkQ7QUFFM0QsZ0RBQXVDO0FBQ3ZDLDhDQUF5QztBQUV6QyxvREFBd0M7QUFHakMsSUFBTSxpQkFBaUIseUJBQXZCLE1BQU0saUJBQWtCLFNBQVEseUJBQVc7SUFVOUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxXQUF3QixFQUFFLFNBQWUsRUFBRSxXQUFpQixFQUFFLE9BQWU7UUFDOUYsTUFBTSxJQUFJLEdBQUcsbUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFFdkIsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztDQUNKLENBQUE7QUFqQkc7SUFEQyxJQUFBLHlCQUFXLEVBQUMsb0JBQU8sQ0FBQztzREFDSTtBQUV6QjtJQURDLElBQUEseUJBQVcsRUFBQyxlQUFJLENBQUM7b0RBQ0Y7QUFFaEI7SUFEQyxJQUFBLHlCQUFXLEVBQUMsZUFBSSxDQUFDO3NEQUNBO0FBRWxCO0lBREMsSUFBQSx5QkFBVyxFQUFDLHNCQUFTLENBQUM7a0RBQ1A7QUFSUCxpQkFBaUI7SUFEN0IsSUFBQSx5QkFBVyxHQUFFO0dBQ0QsaUJBQWlCLENBbUI3QjtBQW5CWSw4Q0FBaUI7QUFzQnZCLElBQU0sa0JBQWtCLDBCQUF4QixNQUFNLGtCQUFtQixTQUFRLHlCQUFXO0lBTS9DLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBWSxFQUFFLE1BQWU7UUFDOUMsTUFBTSxJQUFJLEdBQUcsb0JBQWtCLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDNUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFFakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUV4QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUN4QixNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxlQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxlQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDM0ksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDL0I7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0NBQ0osQ0FBQTtBQWpCRztJQURDLElBQUEseUJBQVcsRUFBQyxzQkFBUyxDQUFDO2dEQUNWO0FBRWI7SUFEQyxJQUFBLHlCQUFXLEVBQUMscUJBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztrREFDVjtBQUo1QixrQkFBa0I7SUFEOUIsSUFBQSx5QkFBVyxHQUFFO0dBQ0Qsa0JBQWtCLENBbUI5QjtBQW5CWSxnREFBa0I7QUFzQnhCLElBQU0sbUJBQW1CLDJCQUF6QixNQUFNLG1CQUFvQixTQUFRLHlCQUFXO0lBSWhELE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBWTtRQUM3QixNQUFNLElBQUksR0FBRyxxQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUU1QyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDdEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWpDLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ2pDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztDQUNKLENBQUE7QUFoQkc7SUFEQyxJQUFBLHlCQUFXLEVBQUMscUJBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztvREFDVDtBQUY5QixtQkFBbUI7SUFEL0IsSUFBQSx5QkFBVyxHQUFFO0dBQ0QsbUJBQW1CLENBa0IvQjtBQWxCWSxrREFBbUI7QUFxQnpCLElBQU0sa0JBQWtCLDBCQUF4QixNQUFNLGtCQUFtQixTQUFRLHlCQUFXO0lBSS9DLE1BQU0sQ0FBQyxhQUFhO1FBQ2hCLE1BQU0sSUFBSSxHQUFHLG9CQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxzQkFBTSxDQUFDLHNCQUFzQixDQUFDO1FBRXhELE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7Q0FDSixDQUFBO0FBUkc7SUFEQyxJQUFBLHlCQUFXLEVBQUMsbUJBQU0sQ0FBQzs4REFDUTtBQUZuQixrQkFBa0I7SUFEOUIsSUFBQSx5QkFBVyxHQUFFO0dBQ0Qsa0JBQWtCLENBVTlCO0FBVlksZ0RBQWtCIn0=