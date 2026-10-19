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
exports.UpdatePatientDto = void 0;
const class_validator_1 = require("class-validator");
class UpdatePatientDto {
}
exports.UpdatePatientDto = UpdatePatientDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Patient name must be a string' }),
    (0, class_validator_1.Length)(2, 100, { message: 'Patient name must be between 2 and 100 characters' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z\s\-'.]+$/, {
        message: 'Patient name may only contain alphabetic characters, spaces, hyphens, and apostrophes',
    }),
    __metadata("design:type", String)
], UpdatePatientDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Contact number must be a string' }),
    (0, class_validator_1.Matches)(/^\+?[0-9\s\-()]{7,20}$/, {
        message: 'Contact number must follow international E.164 or standardized phone formatting (+1-555-555-5555)',
    }),
    __metadata("design:type", String)
], UpdatePatientDto.prototype, "contactNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Medical notes must be a string' }),
    (0, class_validator_1.MaxLength)(2000, { message: 'Medical notes cannot exceed 2000 characters' }),
    __metadata("design:type", String)
], UpdatePatientDto.prototype, "medicalNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Diagnosis code must be a string' }),
    (0, class_validator_1.Matches)(/^[A-Z][0-9]{2}(\.[0-9]{1,4})?$/, {
        message: 'Diagnosis code must conform to standardized ICD-10 diagnostic nomenclature',
    }),
    __metadata("design:type", String)
], UpdatePatientDto.prototype, "diagnosisCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'Consent withdrawn flag must be a boolean' }),
    __metadata("design:type", Boolean)
], UpdatePatientDto.prototype, "consentWithdrawn", void 0);
//# sourceMappingURL=update-patient.dto.js.map