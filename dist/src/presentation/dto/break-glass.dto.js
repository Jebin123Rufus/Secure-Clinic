"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakGlassDto = void 0;
const class_validator_1 = require("class-validator");
class BreakGlassDto {
}
exports.BreakGlassDto = BreakGlassDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Emergency medical justification is mandatory for Break-Glass bypass' }),
    (0, class_validator_1.IsString)({ message: 'Emergency reason must be a string' }),
    (0, class_validator_1.Length)(10, 500, {
        message: 'Break-glass reason must be a detailed description between 10 and 500 characters',
    }),
    __metadata("design:type", String)
], BreakGlassDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Attending physician or authorized incident commander ID is mandatory' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BreakGlassDto.prototype, "authorizedBy", void 0);
//# sourceMappingURL=break-glass.dto.js.map