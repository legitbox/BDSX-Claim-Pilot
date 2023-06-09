"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WandUseEvent = void 0;
const blockpos_1 = require("bdsx/bds/blockpos");
const eventStorage_1 = require("./eventStorage");
const common_1 = require("bdsx/common");
const event_1 = require("bdsx/event");
const configManager_1 = require("../configManager");
const utils_1 = require("../utils");
const claimBuilder_1 = require("../claims/claimBuilder");
var WandUseEvent;
(function (WandUseEvent) {
    WandUseEvent.ID = 'WandUseEvent';
    WandUseEvent.CANCELABLE = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(WandUseEvent.ID, callback);
    }
    WandUseEvent.register = register;
    function handleFireCallbacks(callbacks, data) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const res = callback(data.pos, data.player, data.item);
            if (res) {
                shouldExecute = false;
            }
        }
        return shouldExecute;
    }
    WandUseEvent.handleFireCallbacks = handleFireCallbacks;
})(WandUseEvent = exports.WandUseEvent || (exports.WandUseEvent = {}));
(0, eventStorage_1.registerEventType)(WandUseEvent);
const wandUseMap = new Map();
event_1.events.itemUseOnBlock.on((ev) => {
    // Checking if a wand was used
    if (!(0, utils_1.isWand)(ev.itemStack)) {
        return;
    }
    // Checking a player is what used the item
    const player = ev.actor;
    if (!player.isPlayer()) {
        return;
    }
    const xuid = player.getXuid();
    const lastUse = wandUseMap.get(xuid);
    const now = Date.now();
    if (lastUse !== undefined && (now - lastUse) <= configManager_1.CONFIG.wandFireRate) {
        // Player is still in the cool down for the item
        return common_1.CANCEL;
    }
    wandUseMap.set(xuid, now);
    const bPos = blockpos_1.BlockPos.create(ev);
    const res = (0, eventStorage_1.fireEvent)(WandUseEvent.ID, {
        pos: bPos,
        player: player,
        item: ev.itemStack,
    });
    if (res) {
        (0, claimBuilder_1.triggerWandUse)(bPos, player);
    }
    return common_1.CANCEL;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2FuZFVzZUV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2FuZFVzZUV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGdEQUEyQztBQUMzQyxpREFBMkU7QUFDM0Usd0NBQW1DO0FBQ25DLHNDQUFrQztBQUNsQyxvREFBd0M7QUFHeEMsb0NBQWdDO0FBQ2hDLHlEQUFzRDtBQUV0RCxJQUFpQixZQUFZLENBb0I1QjtBQXBCRCxXQUFpQixZQUFZO0lBQ1osZUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQix1QkFBVSxHQUFHLElBQUksQ0FBQztJQUcvQixTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUZlLHFCQUFRLFdBRXZCLENBQUE7SUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxTQUFxQixFQUFFLElBQVM7UUFDaEUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZELElBQUksR0FBRyxFQUFFO2dCQUNMLGFBQWEsR0FBRyxLQUFLLENBQUM7YUFDekI7U0FDSjtRQUVELE9BQU8sYUFBYSxDQUFDO0lBQ3pCLENBQUM7SUFWZSxnQ0FBbUIsc0JBVWxDLENBQUE7QUFDTCxDQUFDLEVBcEJnQixZQUFZLEdBQVosb0JBQVksS0FBWixvQkFBWSxRQW9CNUI7QUFFRCxJQUFBLGdDQUFpQixFQUFDLFlBQVksQ0FBQyxDQUFDO0FBRWhDLE1BQU0sVUFBVSxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO0FBRWxELGNBQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUU7SUFDNUIsOEJBQThCO0lBQzlCLElBQUksQ0FBQyxJQUFBLGNBQU0sRUFBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDdkIsT0FBTztLQUNWO0lBRUQsMENBQTBDO0lBQzFDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUNwQixPQUFPO0tBQ1Y7SUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFOUIsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDdkIsSUFBSSxPQUFPLEtBQUssU0FBUyxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLHNCQUFNLENBQUMsWUFBWSxFQUFFO1FBQ2pFLGdEQUFnRDtRQUNoRCxPQUFPLGVBQU0sQ0FBQztLQUNqQjtJQUVELFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLE1BQU0sSUFBSSxHQUFHLG1CQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRWpDLE1BQU0sR0FBRyxHQUFHLElBQUEsd0JBQVMsRUFBQyxZQUFZLENBQUMsRUFBRSxFQUFFO1FBQ25DLEdBQUcsRUFBRSxJQUFJO1FBQ1QsTUFBTSxFQUFFLE1BQU07UUFDZCxJQUFJLEVBQUUsRUFBRSxDQUFDLFNBQVM7S0FDckIsQ0FBQyxDQUFBO0lBRUYsSUFBSSxHQUFHLEVBQUU7UUFDTCxJQUFBLDZCQUFjLEVBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0tBQ2hDO0lBRUQsT0FBTyxlQUFNLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMifQ==