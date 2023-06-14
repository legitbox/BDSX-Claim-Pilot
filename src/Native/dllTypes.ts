import {NativeClass, nativeClass, nativeField} from "bdsx/nativeclass";
import {bool_t, CxxString, int32_t} from "bdsx/nativetype";
import {DimensionId} from "bdsx/bds/actor";
import {Vec3} from "bdsx/bds/blockpos";
import {CxxVector} from "bdsx/cxxvector";
import {Claim} from "../claims/claim";
import {CONFIG} from "../configManager";

@nativeClass()
export class NativeClaimObject extends NativeClass {
    @nativeField(int32_t)
    dimensionId: DimensionId;
    @nativeField(Vec3)
    cornerOne: Vec3;
    @nativeField(Vec3)
    cornerEight: Vec3;
    @nativeField(CxxString)
    claimId: string;

    static uglyConstruct(dimensionId: DimensionId, cornerOne: Vec3, cornerEight: Vec3, claimId: string) {
        const inst = NativeClaimObject.allocate();
        inst.dimensionId = dimensionId;
        inst.cornerOne.construct(cornerOne);
        inst.cornerEight.construct(cornerEight);
        inst.claimId = claimId;

        return inst;
    }
}

@nativeClass()
export class NativePlayerObject extends NativeClass {
    @nativeField(CxxString)
    xuid: string;
    @nativeField(CxxVector.make(NativeClaimObject))
    claims: CxxVector<NativeClaimObject>;

    static uglyConstruct(xuid: string, claims: Claim[]) {
        const inst = NativePlayerObject.construct();
        inst.xuid = xuid;

        inst.claims.construct();

        for (const claim of claims) {
            const claimInst = NativeClaimObject.uglyConstruct(claim.dimension, Vec3.create(claim.cornerOne), Vec3.create(claim.cornerEight), claim.id);
            inst.claims.push(claimInst);
        }

        return inst;
    }
}

@nativeClass()
export class NativeStorageObject extends NativeClass {
    @nativeField(CxxVector.make(NativePlayerObject))
    players: CxxVector<NativePlayerObject>;

    static uglyConstruct(storage: any) {
        const inst = NativeStorageObject.allocate();

        inst.players.construct();
        const xuids = Object.keys(storage);
        for (const xuid of xuids) {
            const playerInfo = storage[xuid];

            const playerInst = NativePlayerObject.uglyConstruct(xuid, playerInfo.claims);
            inst.players.push(playerInst);
        }

        return inst;
    }
}

@nativeClass()
export class NativeConfigObject extends NativeClass {
    @nativeField(bool_t)
    explosionsDisabled: boolean;

    static uglyConstruct() {
        const inst = NativeConfigObject.allocate();
        inst.explosionsDisabled = CONFIG.claimDisableExplosions;

        return inst;
    }
}