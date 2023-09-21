"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./claimCommand");
require("./modClaimCommand");
require("./playtimeCommand");
require("./configCommand");
const eventStorage_1 = require("../events/eventStorage");
const commandsRegisteredEvent_1 = require("../events/commandsRegisteredEvent");
(0, eventStorage_1.fireEvent)(commandsRegisteredEvent_1.CommandsRegisteredEvent.ID, undefined);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDBCQUF3QjtBQUN4Qiw2QkFBMkI7QUFDM0IsNkJBQTJCO0FBQzNCLDJCQUF5QjtBQUN6Qix5REFBaUQ7QUFDakQsK0VBQTBFO0FBRTFFLElBQUEsd0JBQVMsRUFBQyxpREFBdUIsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMifQ==