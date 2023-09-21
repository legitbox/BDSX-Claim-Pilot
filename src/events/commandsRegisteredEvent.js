"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandsRegisteredEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var CommandsRegisteredEvent;
(function (CommandsRegisteredEvent) {
    CommandsRegisteredEvent.ID = 'CommandsRegisteredEvent';
    CommandsRegisteredEvent.CANCELABLE = false;
    CommandsRegisteredEvent.ASYNC_ALLOWED = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(CommandsRegisteredEvent.ID, callback);
    }
    CommandsRegisteredEvent.register = register;
    async function handleFireCallbacks(callbacks, _data) {
        for (const callback of callbacks) {
            const callbackResult = callback();
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
    CommandsRegisteredEvent.handleFireCallbacks = handleFireCallbacks;
})(CommandsRegisteredEvent = exports.CommandsRegisteredEvent || (exports.CommandsRegisteredEvent = {}));
(0, eventStorage_1.registerEventType)(CommandsRegisteredEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHNSZWdpc3RlcmVkRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb21tYW5kc1JlZ2lzdGVyZWRFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpREFBZ0U7QUFFaEUsSUFBaUIsdUJBQXVCLENBa0J2QztBQWxCRCxXQUFpQix1QkFBdUI7SUFDdkIsMEJBQUUsR0FBRyx5QkFBeUIsQ0FBQztJQUMvQixrQ0FBVSxHQUFHLEtBQUssQ0FBQztJQUNuQixxQ0FBYSxHQUFHLElBQUksQ0FBQztJQUdsQyxTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLHdCQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRmUsZ0NBQVEsV0FFdkIsQ0FBQTtJQUVNLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxTQUFxQixFQUFFLEtBQVU7UUFDdkUsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUU7WUFDOUIsTUFBTSxjQUFjLEdBQUcsUUFBUSxFQUFFLENBQUM7WUFDbEMsSUFBSSxjQUFjLFlBQVksT0FBTyxFQUFFO2dCQUNuQyxNQUFNLGNBQWMsQ0FBQzthQUN4QjtTQUNKO0lBQ0wsQ0FBQztJQVBxQiwyQ0FBbUIsc0JBT3hDLENBQUE7QUFDTCxDQUFDLEVBbEJnQix1QkFBdUIsR0FBdkIsK0JBQXVCLEtBQXZCLCtCQUF1QixRQWtCdkM7QUFFRCxJQUFBLGdDQUFpQixFQUFDLHVCQUF1QixDQUFDLENBQUMifQ==