import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import corporateEmailService from '../../../services/corporateEmailService';
import { useAuth } from '../../../contexts/AuthContext';

const TeamManagement = ({ teamMembers, onAddMember, onUpdateMember }) => {
  const { userProfile } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null); // { type: 'success'|'error', message }
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    department: '',
    role: 'Employee'
  });

  const handleAddMember = async () => {
    if (newMember?.name && newMember?.email && newMember?.department) {
      const member = {
        ...newMember,
        id: Date.now(),
        status: 'Active',
        bookings: 0,
        lastBooking: 'Never'
      };
      onAddMember(member);

      // Send invitation email
      setInviteLoading(true);
      setInviteStatus(null);
      try {
        const companyName = userProfile?.company_name || userProfile?.companyName || 'your company';
        const inviterName = userProfile?.full_name || userProfile?.fullName || 'Your manager';
        const result = await corporateEmailService?.sendTeamInvitation({
          inviteeEmail: newMember?.email,
          inviteeName: newMember?.name,
          inviterName,
          companyName,
          department: newMember?.department,
          role: newMember?.role
        });
        setInviteStatus({
          type: result?.success ? 'success' : 'error',
          message: result?.success
            ? `Invitation sent to ${newMember?.email}`
            : `Member added, but invitation email failed: ${result?.error}`
        });
      } catch (err) {
        setInviteStatus({ type: 'error', message: 'Member added, but invitation email failed.' });
      } finally {
        setInviteLoading(false);
      }

      setNewMember({ name: '', email: '', department: '', role: 'Employee' });
      setShowAddForm(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800';
      case 'Manager':
        return 'bg-blue-100 text-blue-800';
      case 'Employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => { setShowAddForm(!showAddForm); setInviteStatus(null); }}
            iconName="Plus"
            iconPosition="left"
          >
            Add Member
          </Button>
        </div>
      </div>

      {/* Invite status banner */}
      {inviteStatus && (
        <div className={`px-6 py-3 flex items-center space-x-2 text-sm ${
          inviteStatus?.type === 'success' ?'bg-green-50 text-green-700 border-b border-green-100' :'bg-red-50 text-red-700 border-b border-red-100'
        }`}>
          <Icon name={inviteStatus?.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={16} />
          <span>{inviteStatus?.message}</span>
          <button onClick={() => setInviteStatus(null)} className="ml-auto">
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Enter name"
              value={newMember?.name}
              onChange={(e) => setNewMember({ ...newMember, name: e?.target?.value })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter email"
              value={newMember?.email}
              onChange={(e) => setNewMember({ ...newMember, email: e?.target?.value })}
            />
            <Input
              label="Department"
              type="text"
              placeholder="Enter department"
              value={newMember?.department}
              onChange={(e) => setNewMember({ ...newMember, department: e?.target?.value })}
            />
            <div className="flex items-end space-x-2">
              <Button variant="default" size="sm" onClick={handleAddMember} disabled={inviteLoading}>
                {inviteLoading ? (
                  <><Icon name="Loader2" size={14} className="animate-spin mr-1" />Sending...</>
                ) : (
                  <>Add & Invite</>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 flex items-center space-x-1">
            <Icon name="Mail" size={12} />
            <span>An invitation email will be sent to the member's email address.</span>
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Bookings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Booking
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamMembers?.map((member) => (
              <tr key={member?.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <Icon name="User" size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{member?.name}</div>
                      <div className="text-sm text-gray-500">{member?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {member?.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member?.role)}`}>
                    {member?.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member?.status)}`}>
                    {member?.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {member?.bookings}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member?.lastBooking}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Icon name="Edit" size={16} />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Icon name="Settings" size={16} />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Icon name="Trash2" size={16} className="text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamManagement;