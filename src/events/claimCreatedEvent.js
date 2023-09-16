"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtraData = exports.ClaimCreationEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var ClaimCreationEvent;
(function (ClaimCreationEvent) {
    ClaimCreationEvent.ID = 'ClaimCreationEvent';
    ClaimCreationEvent.CANCELABLE = true;
    ClaimCreationEvent.ASYNC_ALLOWED = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(ClaimCreationEvent.ID, callback);
    }
    ClaimCreationEvent.register = register;
    async function handleFireCallbacks(callbacks, data) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            console.log("Triggering callback!");
            const callbackResult = callback(data.claim, data.ownerXuid);
            let extraData;
            if (callbackResult instanceof Promise) {
                extraData = await callbackResult;
            }
            else {
                extraData = callbackResult;
            }
            claimCreationExtraData.set(data.claim.id, extraData);
            let res = extraData.shouldCreate;
            if (res !== undefined && !res) {
                shouldExecute = false;
            }
        }
        return shouldExecute;
    }
    ClaimCreationEvent.handleFireCallbacks = handleFireCallbacks;
})(ClaimCreationEvent = exports.ClaimCreationEvent || (exports.ClaimCreationEvent = {}));
function createDefaultClaimCreateExtraData() {
    return {
        shouldCreate: true,
        shouldSendDefaultMessage: true,
    };
}
// A bit of an iffy system if multiple plugins want to do things for this.
// The latest update is the one that gets used, so it's very unreliable as to when an extra data will be chosen and from where.
// Though it's not likely that a plugin wrapping the claim creation system will be compatible with another doing the same.
// If something gets reported I might try and figure out some priority system
const claimCreationExtraData = new Map();
function getExtraData(claimId, shouldRemove = true) {
    let res = claimCreationExtraData.get(claimId);
    if (res === undefined) {
        res = createDefaultClaimCreateExtraData();
    }
    if (shouldRemove) {
        claimCreationExtraData.delete(claimId);
    }
    return res;
}
exports.getExtraData = getExtraData;
(0, eventStorage_1.registerEventType)(ClaimCreationEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1DcmVhdGVkRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbUNyZWF0ZWRFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpREFBZ0U7QUFFaEUsSUFBaUIsa0JBQWtCLENBaUNsQztBQWpDRCxXQUFpQixrQkFBa0I7SUFDbEIscUJBQUUsR0FBRyxvQkFBb0IsQ0FBQztJQUMxQiw2QkFBVSxHQUFHLElBQUksQ0FBQztJQUNsQixnQ0FBYSxHQUFHLElBQUksQ0FBQztJQUdsQyxTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLG1CQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRmUsMkJBQVEsV0FFdkIsQ0FBQTtJQUVNLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxTQUFxQixFQUFFLElBQVM7UUFDdEUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUNwQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDNUQsSUFBSSxTQUFTLENBQUM7WUFDZCxJQUFJLGNBQWMsWUFBWSxPQUFPLEVBQUU7Z0JBQ25DLFNBQVMsR0FBRyxNQUFNLGNBQWMsQ0FBQzthQUNwQztpQkFBTTtnQkFDSCxTQUFTLEdBQUcsY0FBYyxDQUFDO2FBQzlCO1lBRUQsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRXJELElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUM7WUFFakMsSUFBSSxHQUFHLEtBQUssU0FBUyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUMzQixhQUFhLEdBQUcsS0FBSyxDQUFDO2FBQ3pCO1NBQ0o7UUFFRCxPQUFPLGFBQWEsQ0FBQztJQUN6QixDQUFDO0lBdEJxQixzQ0FBbUIsc0JBc0J4QyxDQUFBO0FBQ0wsQ0FBQyxFQWpDZ0Isa0JBQWtCLEdBQWxCLDBCQUFrQixLQUFsQiwwQkFBa0IsUUFpQ2xDO0FBT0QsU0FBUyxpQ0FBaUM7SUFDdEMsT0FBTztRQUNILFlBQVksRUFBRSxJQUFJO1FBQ2xCLHdCQUF3QixFQUFFLElBQUk7S0FDakMsQ0FBQTtBQUNMLENBQUM7QUFFRCwwRUFBMEU7QUFDMUUsK0hBQStIO0FBQy9ILDBIQUEwSDtBQUMxSCw2RUFBNkU7QUFDN0UsTUFBTSxzQkFBc0IsR0FBd0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUU5RSxTQUFnQixZQUFZLENBQUMsT0FBZSxFQUFFLGVBQXdCLElBQUk7SUFDdEUsSUFBSSxHQUFHLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlDLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRTtRQUNuQixHQUFHLEdBQUcsaUNBQWlDLEVBQUUsQ0FBQztLQUM3QztJQUVELElBQUksWUFBWSxFQUFFO1FBQ2Qsc0JBQXNCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQzFDO0lBRUQsT0FBTyxHQUFHLENBQUM7QUFDZixDQUFDO0FBWEQsb0NBV0M7QUFFRCxJQUFBLGdDQUFpQixFQUFDLGtCQUFrQixDQUFDLENBQUMifQ==