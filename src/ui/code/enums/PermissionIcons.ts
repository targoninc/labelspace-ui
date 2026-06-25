import { Permissions } from "./Permissions";

export const PermissionIcons: Record<Permissions, string> = {
    fileManagement: "attach_file",
    sendNewsletters: "mail",
    [Permissions.canViewLogs]: "table_eye",
    [Permissions.importData]: "database_upload",
    [Permissions.userManagement]: "manage_accounts",
    [Permissions.releaseManagement]: "music_note",
    [Permissions.releaseEditing]: "edit",
    [Permissions.convertSubmissions]: "swap_horiz"
}