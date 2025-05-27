import React from 'react';

interface UserProfileProps {
  name: string;
  email: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ name, email }) => {
  return (
    <div>
      <h2>User Profile</h2>
      <p>Name: {name}</p>
      <p>Email: {email}</p>
    </div>
  );
};

export default UserProfile;
