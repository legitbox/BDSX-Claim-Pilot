"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const event_1 = require("bdsx/event");
const claim_1 = require("./claim");
const command_1 = require("bdsx/bds/command");
const common_1 = require("bdsx/common");
const player_1 = require("bdsx/bds/player");
const prochacker_1 = require("bdsx/prochacker");
const nativetype_1 = require("bdsx/nativetype");
const block_1 = require("bdsx/bds/block");
const blockpos_1 = require("bdsx/bds/blockpos");
const actor_1 = require("bdsx/bds/actor");
const inventory_1 = require("bdsx/bds/inventory");
const nativeclass_1 = require("bdsx/nativeclass");
event_1.events.blockDestroy.on((ev) => {
    const xuid = ev.player.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to break blocks in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.blockPlace.on((ev) => {
    const xuid = ev.player.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to place blocks in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.blockInteractedWith.on((ev) => {
    const xuid = ev.player.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou dont have permission to use blocks in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.itemUse.on((ev) => {
    return handleItemUseClaimCheck(ev.player);
});
event_1.events.itemUseOnBlock.on((ev) => {
    if (!ev.actor.isPlayer()) {
        return;
    }
    const xuid = ev.actor.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(ev, ev.actor.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && ev.actor.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.actor.sendMessage('§cYou dont have permission to use items in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.playerAttack.on((ev) => {
    const claim = (0, claim_1.getClaimAtPos)(ev.victim.getPosition(), ev.victim.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.player.getXuid();
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        ev.player.sendMessage('§cYou are not allowed to harm entities in this claim!');
        return common_1.CANCEL;
    }
});
event_1.events.blockInteractedWith.on((ev) => {
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.player.getXuid();
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        console.log('In here!');
        return common_1.CANCEL;
    }
});
event_1.events.playerInteract.on((ev) => {
    const claim = (0, claim_1.getClaimAtPos)(ev.victim.getPosition(), ev.victim.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.player.getXuid();
    if (claim.owner !== xuid && ev.player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return common_1.CANCEL;
    }
});
event_1.events.entityStartRiding.on((ev) => {
    if (!ev.entity.isPlayer()) {
        return;
    }
    const claim = (0, claim_1.getClaimAtPos)(ev.ride.getPosition(), ev.ride.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.entity.getXuid();
    if (claim.owner !== xuid && ev.entity.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return common_1.CANCEL;
    }
});
function handleItemUseClaimCheck(player) {
    const xuid = player.getXuid();
    const claim = (0, claim_1.getClaimAtPos)(player.getPosition(), player.getDimensionId());
    if (claim === undefined) {
        return;
    }
    if (claim.owner !== xuid && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        player.sendMessage('§cYou dont have permission to use items in this claim!');
        return common_1.CANCEL;
    }
}
event_1.events.farmlandDecay.on((ev) => {
    if (!ev.culprit.isPlayer()) {
        return;
    }
    const claim = (0, claim_1.getClaimAtPos)(ev.blockPos, ev.culprit.getDimensionId());
    if (claim === undefined) {
        return;
    }
    const xuid = ev.culprit.getXuid();
    if (claim.owner !== xuid && ev.culprit.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return common_1.CANCEL;
    }
    return;
});
const grassBlock$tryToTill = prochacker_1.procHacker.hooking('?tryToTill@GrassBlock@@UEBA_NAEAVBlockSource@@AEBVBlockPos@@AEAVActor@@AEAVItemStack@@@Z', nativetype_1.bool_t, { this: block_1.Block }, block_1.BlockSource, blockpos_1.BlockPos, actor_1.Actor, inventory_1.ItemStack)(onTryTill);
function onTryTill(region, pos, tiller, item) {
    if (!tiller.isPlayer()) {
        return grassBlock$tryToTill.call(this, region, pos, tiller, item);
    }
    const claim = (0, claim_1.getClaimAtPos)(pos, tiller.getDimensionId());
    if (claim === undefined) {
        return grassBlock$tryToTill.call(this, region, pos, tiller, item);
    }
    const xuid = tiller.getXuid();
    if (claim.owner !== xuid && tiller.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return false;
    }
    return grassBlock$tryToTill.call(this, region, pos, tiller, item);
}
class BucketItem extends nativeclass_1.NativeClass {
}
let InteractionResult = class InteractionResult extends nativeclass_1.NativeClass {
};
tslib_1.__decorate([
    (0, nativeclass_1.nativeField)(nativetype_1.int32_t)
], InteractionResult.prototype, "value", void 0);
InteractionResult = tslib_1.__decorate([
    (0, nativeclass_1.nativeClass)()
], InteractionResult);
let _bucketItem_useOn = prochacker_1.procHacker.hooking("?_useOn@BucketItem@@EEBA?AVInteractionResult@@AEAVItemStack@@AEAVActor@@VBlockPos@@EAEBVVec3@@@Z", InteractionResult, { this: BucketItem }, InteractionResult, inventory_1.ItemStack, actor_1.Actor, blockpos_1.BlockPos, nativetype_1.uint8_t, blockpos_1.Vec3)(onUseBucket);
function onUseBucket(res, item, actor, pos, side, uVec3) {
    if (!actor.isPlayer()) {
        return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
    }
    const claim = (0, claim_1.getClaimAtPos)(pos, actor.getDimensionId());
    if (claim === undefined) {
        return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
    }
    const xuid = actor.getXuid();
    if (claim.owner !== xuid && actor.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        const falseResult = InteractionResult.allocate();
        falseResult.value = 0;
        return falseResult;
    }
    return _bucketItem_useOn.call(this, res, item, actor, pos, side, uVec3);
}
const block$use = prochacker_1.procHacker.hooking('?use@Block@@QEBA_NAEAVPlayer@@AEBVBlockPos@@EV?$optional@VVec3@@@std@@@Z', nativetype_1.bool_t, { this: block_1.Block }, player_1.ServerPlayer, blockpos_1.BlockPos, nativetype_1.uint8_t)(onUseRepeater);
function onUseRepeater(player, pos, side) {
    const claim = (0, claim_1.getClaimAtPos)(pos, player.getDimensionId());
    if (claim === undefined) {
        return block$use.call(this, player, pos, side);
    }
    const xuid = player.getXuid();
    if (claim.owner !== xuid && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        player.sendMessage('§cYou dont have permission to use blocks in this claim!');
        return false;
    }
    return block$use.call(this, player, pos, side);
}
const itemFrameBlock$attack = prochacker_1.procHacker.hooking('?attack@ItemFrameBlock@@UEBA_NPEAVPlayer@@AEBVBlockPos@@@Z', nativetype_1.bool_t, { this: block_1.Block }, player_1.ServerPlayer, blockpos_1.BlockPos)(onItemFrameAttack);
function onItemFrameAttack(player, pos) {
    const claim = (0, claim_1.getClaimAtPos)(pos, player.getDimensionId());
    if (claim === undefined) {
        return itemFrameBlock$attack.call(this, player, pos);
    }
    const xuid = player.getXuid();
    if (claim.owner !== xuid && player.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return false;
    }
    return itemFrameBlock$attack.call(this, player, pos);
}
const basePressurePlate$checkPressed = prochacker_1.procHacker.hooking('?checkPressed@BasePressurePlateBlock@@IEBAXAEAVBlockSource@@AEBVBlockPos@@PEAVActor@@HH@Z', nativetype_1.void_t, { this: block_1.Block }, block_1.BlockSource, blockpos_1.BlockPos, actor_1.Actor, nativetype_1.int32_t, nativetype_1.int32_t)(onCheckPressed);
function onCheckPressed(region, pos, presser, uNum1, uNum2) {
    if (presser === null || !presser.isPlayer()) {
        return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
    }
    const claim = (0, claim_1.getClaimAtPos)(pos, region.getDimensionId());
    if (claim === undefined) {
        return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
    }
    const xuid = presser.getXuid();
    if (claim.owner !== xuid && presser.getCommandPermissionLevel() === command_1.CommandPermissionLevel.Normal) {
        return;
    }
    return basePressurePlate$checkPressed.call(this, region, pos, presser, uNum1, uNum2);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1BY3Rpb25CbG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsYWltQWN0aW9uQmxvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQWtDO0FBQ2xDLG1DQUFzQztBQUN0Qyw4Q0FBd0Q7QUFDeEQsd0NBQW1DO0FBQ25DLDRDQUE2QztBQUM3QyxnREFBMkM7QUFDM0MsZ0RBQWlFO0FBQ2pFLDBDQUFrRDtBQUNsRCxnREFBaUQ7QUFDakQsMENBQXFDO0FBQ3JDLGtEQUE2QztBQUM3QyxrREFBdUU7QUFFdkUsY0FBTSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtJQUMxQixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pDLE1BQU0sS0FBSyxHQUFHLElBQUEscUJBQWEsRUFBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUVyRSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7UUFDckIsT0FBTztLQUNWO0lBRUQsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUFFLEtBQUssZ0NBQXNCLENBQUMsTUFBTSxFQUFFO1FBQ2pHLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7UUFDbkYsT0FBTyxlQUFNLENBQUM7S0FDakI7QUFDTCxDQUFDLENBQUMsQ0FBQTtBQUVGLGNBQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7SUFDeEIsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQyxNQUFNLEtBQUssR0FBRyxJQUFBLHFCQUFhLEVBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFF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