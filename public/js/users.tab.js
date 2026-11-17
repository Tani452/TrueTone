/**
 * Users Tab Frontend Module
 * Controls the team directory, department filters, and granular role permissions.
 */

window.UsersTab = {
    selectedDept: '',

    async load() {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #94a3b8;">Loading team members...</td></tr>';

        // Load departments
        this.loadDepartments();

        try {
            const params = new URLSearchParams();
            if (this.selectedDept) params.append('department', this.selectedDept);

            const res = await fetch(`/api/users?${params.toString()}`);
            const json = await res.json();

            if (!json.success) throw new Error(json.error);

            const users = json.data || [];
            document.getElementById('badge-users-count').textContent = json.total || users.length;

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">No members found in this department.</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => this.renderUserRow(u)).join('');
            this.bindEvents();
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="9" style="color: #ef4444; text-align: center; padding: 20px;">Failed to load users: ${err.message}</td></tr>`;
        }
    },

    async loadDepartments() {
        try {
            const res = await fetch('/api/users/departments');
            const data = await res.json();
            if (data.success && data.data) {
                const pillsContainer = document.getElementById('users-dept-pills');
                const pillsHtml = `
                    <button class="filter-pill ${!this.selectedDept ? 'active' : ''}" data-dept="">All Departments</button>
                    ${data.data.map(d => `
                        <button class="filter-pill ${this.selectedDept === d.department ? 'active' : ''}" data-dept="${d.department}">
                            ${d.department} (${d.user_count})
                        </button>
                    `).join('')}
                `;
                pillsContainer.innerHTML = pillsHtml;

                // Rebind click events
                pillsContainer.querySelectorAll('.filter-pill').forEach(pill => {
                    pill.onclick = () => {
                        this.selectedDept = pill.dataset.dept;
                        this.load();
                    };
                });
            }
        } catch (e) {
            // Non-critical
        }
    },

    renderUserRow(u) {
        const postBadge = u.can_post === 'Y' ? '<span class="badge-tag perm-y">CAN POST (Y)</span>' : '<span class="badge-tag perm-n">NO (N)</span>';
        const approveBadge = u.can_approve === 'Y' ? '<span class="badge-tag perm-y">APPROVER (Y)</span>' : '<span class="badge-tag perm-n">NO (N)</span>';
        const actionBadge = u.can_take_action === 'Y' ? '<span class="badge-tag perm-y">ACTION (Y)</span>' : '<span class="badge-tag perm-n">NO (N)</span>';

        return `
            <tr>
                <td><strong>#${u.user_id}</strong></td>
                <td>
                    <div style="font-weight: 600; color: #f8fafc;">${u.user_name}</div>
                </td>
                <td><span style="color: #60a5fa;">${u.department || 'General'}</span></td>
                <td>${u.designation || 'Team Member'}</td>
                <td style="font-family: monospace; font-size: 0.82rem;">${u.contact_no || 'N/A'}</td>
                <td>${postBadge}</td>
                <td>${approveBadge}</td>
                <td>${actionBadge}</td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn-vote" style="padding: 4px 8px; font-size: 0.72rem;" onclick="UsersTab.togglePermission('${u.user_id}', 'can_approve', '${u.can_approve}')" title="Toggle can_approve">
                            ${u.can_approve === 'Y' ? 'Revoke Approve' : 'Grant Approve'}
                        </button>
                        <button class="btn-vote" style="padding: 4px 8px; font-size: 0.72rem;" onclick="UsersTab.togglePermission('${u.user_id}', 'can_take_action', '${u.can_take_action}')" title="Toggle can_take_action">
                            ${u.can_take_action === 'Y' ? 'Revoke Action' : 'Grant Action'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    bindEvents() {
        const addBtn = document.getElementById('btn-open-new-user-modal');
        if (addBtn) {
            addBtn.onclick = () => this.openAddUserModal();
        }
    },

    async togglePermission(id, field, currentValue) {
        const newValue = currentValue === 'Y' ? 'N' : 'Y';
        try {
            const res = await fetch(`/api/users/${id}/permissions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: newValue }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            TrueTone.showToast(`Updated ${field} to ${newValue} for user #${id}`, 'success');
            this.load();
        } catch (err) {
            TrueTone.showToast(`Permission update failed: ${err.message}`, 'error');
        }
    },

    openAddUserModal() {
        const html = `
            <div>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Full Name *</label>
                    <input type="text" id="new-user-name" placeholder="e.g. Jordan Hayes" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Designation</label>
                    <input type="text" id="new-user-desig" placeholder="e.g. Content Strategist" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Department</label>
                    <input type="text" id="new-user-dept" placeholder="e.g. Content & Creative Marketing" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 14px;">
                    <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 4px;">Contact No</label>
                    <input type="text" id="new-user-phone" placeholder="e.g. +1-555-0199" style="width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 18px; display: flex; gap: 20px; font-size: 0.85rem; color: #cbd5e1;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="checkbox" id="new-user-can-post" checked> Can Post
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="checkbox" id="new-user-can-approve"> Can Approve
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="checkbox" id="new-user-can-act"> Can Take Action
                    </label>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-vote" onclick="TrueTone.closeModal()">Cancel</button>
                    <button class="btn-primary" onclick="UsersTab.submitNewUser()">Create Member</button>
                </div>
            </div>
        `;

        TrueTone.openModal('Add New Team Member', html);
    },

    async submitNewUser() {
        const userName = document.getElementById('new-user-name').value.trim();
        const designation = document.getElementById('new-user-desig').value.trim();
        const department = document.getElementById('new-user-dept').value.trim();
        const contactNo = document.getElementById('new-user-phone').value.trim();
        const canPost = document.getElementById('new-user-can-post').checked ? 'Y' : 'N';
        const canApprove = document.getElementById('new-user-can-approve').checked ? 'Y' : 'N';
        const canAct = document.getElementById('new-user-can-act').checked ? 'Y' : 'N';

        if (!userName) {
            TrueTone.showToast('Please provide a user name', 'error');
            return;
        }

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_name: userName,
                    designation,
                    department,
                    contact_no: contactNo,
                    can_post: canPost,
                    can_approve: canApprove,
                    can_take_action: canAct,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            TrueTone.closeModal();
            TrueTone.showToast('User created successfully in users table', 'success');
            this.load();
        } catch (err) {
            TrueTone.showToast(`User creation failed: ${err.message}`, 'error');
        }
    }
};
