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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientController = void 0;
const common_1 = require("@nestjs/common");
const patient_service_1 = require("../../application/services/patient.service");
const create_patient_dto_1 = require("../dto/create-patient.dto");
const update_patient_dto_1 = require("../dto/update-patient.dto");
const break_glass_dto_1 = require("../dto/break-glass.dto");
const roles_guard_1 = require("../guards/roles.guard");
const audit_log_interceptor_1 = require("../interceptors/audit-log.interceptor");
const roles_decorator_1 = require("../decorators/roles.decorator");
const current_user_decorator_1 = require("../decorators/current-user.decorator");
let PatientController = class PatientController {
    constructor(patientService) {
        this.patientService = patientService;
    }
    async create(createDto, context) {
        return this.patientService.createPatient(createDto, context);
    }
    async findAll(context) {
        return this.patientService.getAllPatients(context);
    }
    async findOne(id, context) {
        return this.patientService.getPatientById(id, context);
    }
    async update(id, updateDto, context) {
        return this.patientService.updatePatient(id, updateDto, context);
    }
    async delete(id, context) {
        return this.patientService.deletePatient(id, context);
    }
    async breakGlass(id, breakGlassDto, context) {
        return this.patientService.breakGlassAccess(id, breakGlassDto, context);
    }
    async exportData(id, context) {
        return this.patientService.exportPatientData(id, context);
    }
    async eraseData(id, context) {
        return this.patientService.erasePatientData(id, context);
    }
};
exports.PatientController = PatientController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('Doctor', 'Clerk'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentSecurityContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_patient_dto_1.CreatePatientDto, Object]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('Doctor', 'Clerk', 'Admin'),
    __param(0, (0, current_user_decorator_1.CurrentSecurityContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('Doctor', 'Clerk', 'Admin'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, current_user_decorator_1.CurrentSecurityContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('Doctor', 'Clerk'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentSecurityContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_patient_dto_1.UpdatePatientDto, Object]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('Doctor', 'Admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, current_user_decorator_1.CurrentSecurityContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/break-glass'),
    (0, roles_decorator_1.Roles)('Doctor', 'Admin'),
    (0, roles_decorator_1.AllowBreakGlass)(true),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentSecurityContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, break_glass_dto_1.BreakGlassDto, Object]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "breakGlass", null);
__decorate([
    (0, common_1.Get)(':id/export'),
    (0, roles_decorator_1.Roles)('Admin'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, current_user_decorator_1.CurrentSecurityContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "exportData", null);
__decorate([
    (0, common_1.Post)(':id/erase'),
    (0, roles_decorator_1.Roles)('Admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, current_user_decorator_1.CurrentSecurityContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PatientController.prototype, "eraseData", null);
exports.PatientController = PatientController = __decorate([
    (0, common_1.Controller)('patients'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, common_1.UseInterceptors)(audit_log_interceptor_1.AuditLogInterceptor),
    __metadata("design:paramtypes", [patient_service_1.PatientService])
], PatientController);
//# sourceMappingURL=patient.controller.js.map