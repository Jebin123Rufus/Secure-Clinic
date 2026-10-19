"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClinicEntity = void 0;
class ClinicEntity {
    constructor(props) {
        this.props = props;
    }
    get id() {
        return this.props.id;
    }
    get name() {
        return this.props.name;
    }
    get code() {
        return this.props.code;
    }
    get isActive() {
        return this.props.isActive;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    get updatedAt() {
        return this.props.updatedAt;
    }
    static fromRow(row) {
        return new ClinicEntity({
            id: row.id,
            name: row.name,
            code: row.code,
            isActive: row.is_active,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}
exports.ClinicEntity = ClinicEntity;
//# sourceMappingURL=clinic.entity.js.map