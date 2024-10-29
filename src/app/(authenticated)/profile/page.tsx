'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';
import {jwtDecode} from 'jwt-decode';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import axios from 'axios';

export const GET_USER_BY_EMAIL = gql`
  query GetUserByEmail($email: String!) {
    userByEmail(email: $email) {
      first_name
      last_name
      email
      phone_number
      address
      date_of_birth
      profile_picture
      total_flight_hours
      email_notifications_enabled
      sms_notifications_enabled
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser(
    $first_name: String!,
    $last_name: String!,
    $email: String!,
    $phone_number: String!,
    $address: String!,
    $date_of_birth: DateTime!,
    $file: Upload
  ) {
    updateUser(
      updateUserInput: {
        first_name: $first_name,
        last_name: $last_name,
        email: $email,
        phone_number: $phone_number,
        address: $address,
        date_of_birth: $date_of_birth
      },
      image: $file
    ) {
      first_name
      last_name
      email
      phone_number
      address
      date_of_birth
      profile_picture
    }
  }
`;

export const UPDATE_PASSWORD = gql`
  mutation UpdatePassword($currentPassword: String!, $newPassword: String!) {
    updatePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      id
      email
    }
  }
`;


export default function ProfilePage() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [show2FAAlert, setShow2FAAlert] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const [updateProfile] = useMutation(UPDATE_USER);
  const [updatePassword] = useMutation(UPDATE_PASSWORD);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: '',
    profile_picture: '',
    total_flight_hours: 0,
    email_notifications_enabled: false,
    sms_notifications_enabled: false,
    licenses: [],
  });

  const [errors, setErrors] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode<{ email: string }>(token);
        setUserEmail(decodedToken.email);
      } catch (error) {
        console.log('Erreur lors du décodage du token:', error);
      }
    }
  }, []);

  const { data: userData, loading, error: errorUser } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: userEmail || '' },
    skip: !userEmail,
  });

  useEffect(() => {
    if (userData && userData.userByEmail) {
      setFormData({
        first_name: userData.userByEmail.first_name,
        last_name: userData.userByEmail.last_name,
        email: userData.userByEmail.email,
        phone_number: userData.userByEmail.phone_number,
        address: userData.userByEmail.address,
        date_of_birth: userData.userByEmail.date_of_birth,
        profile_picture: userData.userByEmail.profile_picture,
        total_flight_hours: userData.userByEmail.total_flight_hours,
        email_notifications_enabled: userData.userByEmail.email_notifications_enabled,
        sms_notifications_enabled: userData.userByEmail.sms_notifications_enabled,
        licenses: userData.userByEmail.licenses,
      });
    }
  }, [userData]);

  const handleCardClick = (cardName: string) => {
    setExpandedCard(expandedCard === cardName ? null : cardName);
  };

  const handleActivate2FA = () => {
    setShow2FAAlert(true);
  };

  const confirmActivate2FA = () => {
    router.push('/administration/2fa');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    setErrors((prev) => ({ ...prev, [name]: '' }));

    if (name === 'address') {
      fetchAddressSuggestions(value);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      date_of_birth: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    if (!formData.first_name) {
      valid = false;
      newErrors.first_name = 'Le prénom est requis.';
    }

    if (!formData.last_name) {
      valid = false;
      newErrors.last_name = 'Le nom est requis.';
    }

    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
      valid = false;
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
      valid = false;
    }

    if (!formData.phone_number) {
      newErrors.phone_number = 'Le numéro de téléphone est requis.';
      valid = false;
    } else if (formData.phone_number && !/^0[1-9]([-. ]?[0-9]{2}){4}$/.test(formData.phone_number)) {
      valid = false;
      newErrors.phone_number = 'Le numéro de téléphone n\'est pas valide.';
    }

    if (!formData.address) {
      valid = false;
      newErrors.address = 'L’adresse est requise.';
    }

    if (!formData.date_of_birth) {
      valid = false;
      newErrors.date_of_birth = 'La date de naissance est requise.';
    }

    if (newPassword.length < 8) {
      newErrors.newPassword = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const { data } = await updatePassword({
        variables: {
          currentPassword,
          newPassword,
        },
      });

      if (data.updatePassword.success) {
        <Alert title="Success">Votre mot de passe vient d'être modifier</Alert>
      } else {
        <Alert title="Erreur">Erreur lors du chargement de votre mot de passe.</Alert>
      }
    } catch (error) {
        <Alert title="Erreur">Erreur lors du chargement de votre mot de passe.</Alert>
    }
  };

  const fetchAddressSuggestions = async (query: string) => {
    if (query.length > 2) {
      try {
        const response = await axios.get(
          `https://api-adresse.data.gouv.fr/search/?q=${query}&limit=5`
        );
        const suggestions = response.data.features.map((feature: any) => feature.properties.label);
        setAddressSuggestions(suggestions);
      } catch (error) {
        console.error('Erreur lors de la récupération des suggestions d’adresses:', error);
      }
    } else {
      setAddressSuggestions([]);
    }
  };

  const selectAddress = (address: string) => {
    setFormData((prev) => ({ ...prev, address }));
    setAddressSuggestions([]);
  };

  const handleSwitchChange = (name: string, value: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveChanges = async () => {
    if (!validateForm()) return;

    try {
      await updateProfile({
        variables: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number,
          address: formData.address,
          date_of_birth: new Date(formData.date_of_birth),
          file: selectedImage,
        },
      });

      console.log('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil', error);
    }
  };

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (errorUser) return <Alert title="Erreur">Erreur lors du chargement des données utilisateur.</Alert>;

  return (
    <div className="p-4 relative">
      {!expandedCard && (
        <div className="grid grid-cols-2 grid-rows-2 gap-4">
          <Card className="h-40 cursor-pointer" onClick={() => handleCardClick('profile')}>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{formData.first_name} {formData.last_name}</p>
              <p>{formData.email}</p>
            </CardContent>
          </Card>

          <Card className="h-40 cursor-pointer" onClick={() => handleCardClick('notifications')}>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Notifications par email: {formData.email_notifications_enabled ? 'Activé' : 'Désactivé'}</p>
              <p>Notifications par SMS: {formData.sms_notifications_enabled ? 'Activé' : 'Désactivé'}</p>
            </CardContent>
          </Card>

          <Card className="h-40 cursor-pointer" onClick={() => handleCardClick('licenses')}>
            <CardHeader>
              <CardTitle>Licences</CardTitle>
            </CardHeader>
            <CardContent>
              {/* <p>{formData.licenses.length > 0 ? `${formData.licenses.length} licences` : 'Aucune licence disponible'}</p> */}
            </CardContent>
          </Card>

          <Card className="h-40 cursor-pointer" onClick={() => handleCardClick('password')}>
            <CardHeader>
              <CardTitle>Mot de passe</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Changez votre mot de passe</p>
            </CardContent>
          </Card>

          <Card className="h-40 cursor-pointer" onClick={handleActivate2FA}>
            <CardHeader>
              <CardTitle>Activer le 2FA</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Renforcez la sécurité de votre compte en activant le 2FA.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {expandedCard === 'licenses' && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 z-40 p-8 shadow-lg rounded-lg pb-14">
          <button
            aria-label="Fermer"
            className="absolute top-4 right-4 text-gray-500 dark:text-gray-200"
            onClick={() => setExpandedCard(null)}
          >
            <X size={24} />
          </button>
          <h2 className="text-center text-2xl font-semibold">Liste des licences</h2>

          <div className="text-center">
            <ul>
              {/* {formData.licenses.map((license) => (
                <li key={license.id}>
                  {license.license_type} - Expire le {new Date(license.expiration_date).toLocaleDateString()}
                </li>
              ))} */}
              <h1>Rien ici pour le moment</h1>
            </ul>
          </div>
        </div>
      )}

      {show2FAAlert && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center">
            <p className="text-lg mb-4">Voulez-vous vraiment activer le 2FA ?</p>
            <div className="flex justify-center space-x-4">
              <Button onClick={confirmActivate2FA}>Oui</Button>
              <Button variant="secondary" onClick={() => setShow2FAAlert(false)}>Non</Button>
            </div>
          </div>
        </div>
      )}

      {expandedCard === 'profile' && (
      <div className="absolute inset-0 bg-white dark:bg-gray-800 z-40 p-8 shadow rounded pb-14">
        <button
          aria-label="Fermer"
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-200"
          onClick={() => setExpandedCard(null)}
        >
          <X size={24} />
        </button>
        <h2 className="text-center text-2xl font-semibold mb-4">Modifier votre profil</h2>
        <div className="mt-12">
          <div className="grid gap-4">
            <Label htmlFor="picture">Photo de profil</Label>
            <div className="flex items-center gap-3">
            {previewImage ? (
                <img
                  src={previewImage}
                  alt="Aperçu de la photo de profil"
                  className="w-20 h-20 rounded-full mt-4"
                />
              ) : formData.profile_picture ? (
                <img
                  src={`http://localhost:3000${formData.profile_picture}`}
                  alt="Photo de profil"
                  className="w-20 h-20 rounded-full mt-4"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-500 flex items-center justify-center text-white text-xl mt-4">
                  {formData.first_name[0]}{formData.last_name[0]}
                </div>
              )}
              <Input
                id="picture"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

            <div>
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={errors.first_name ? 'border-red-500' : ''}
              />
              {errors.first_name && <p className="text-red-500">{errors.first_name}</p>}
            </div>

            <div>
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={errors.last_name ? 'border-red-500' : ''}
              />
              {errors.last_name && <p className="text-red-500">{errors.last_name}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-red-500">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone_number">Numéro de téléphone</Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className={errors.phone_number ? 'border-red-500' : ''}
              />
              {errors.phone_number && <p className="text-red-500">{errors.phone_number}</p>}
            </div>

            <div>
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={errors.address ? 'border-red-500' : ''}
              />
              {errors.address && <p className="text-red-500">{errors.address}</p>}
              {addressSuggestions.length > 0 && (
                <ul className="border border-gray-300 mt-2 rounded-lg max-h-40 overflow-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="p-2 cursor-pointer hover:bg-gray-200"
                      onClick={() => selectAddress(suggestion)}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <Label htmlFor="date_of_birth">Date de naissance</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                className={errors.date_of_birth ? 'border-red-500' : ''}
              />
              {errors.date_of_birth && <p className="text-red-500">{errors.date_of_birth}</p>}
            </div>

          </div>
          <Button className='mb-16 mt-8' onClick={saveChanges}>Enregistrer les modifications</Button>
        </div>
      </div>
      )}

      {expandedCard === 'notifications' && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 z-40 p-8 shadow-lg rounded-lg pb-14">
          <button
            aria-label="Fermer"
            className="absolute top-4 right-4 text-gray-500 dark:text-gray-200"
            onClick={() => setExpandedCard(null)}
          >
            <X size={24} />
          </button>
          <h2 className="text-center text-2xl font-semibold">Modifier les notifications</h2>

          <div className="mt-12">
            <div className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email_notifications_enabled"
                  checked={formData.email_notifications_enabled}
                  onCheckedChange={(value) => handleSwitchChange('email_notifications_enabled', value)}
                />
                <Label htmlFor="email_notifications_enabled">Notifications par email</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="sms_notifications_enabled"
                  checked={formData.sms_notifications_enabled}
                  onCheckedChange={(value) => handleSwitchChange('sms_notifications_enabled', value)}
                />
                <Label htmlFor="sms_notifications_enabled">Notifications par SMS</Label>
              </div>
            </div>
            <Button className="mb-16 mt-8" onClick={saveChanges}>Enregistrer les modifications</Button>
          </div>
        </div>
      )}

      {expandedCard === 'password' && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 z-40 p-8 shadow-lg rounded-lg pb-14">
          <button
            aria-label="Fermer"
            className="absolute top-4 right-4 text-gray-500 dark:text-gray-200"
            onClick={() => setExpandedCard(null)}
          >
            <X size={24} />
          </button>
          <h2 className="text-center text-2xl font-semibold">Modifier votre mot de passe</h2>

          <div className="mt-12">
            <div className='grid gap-4'>
              <h2 className="text-xl font-semibold text-center mb-4">Changer le mot de passe</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <Input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={errors.currentPassword ? 'border-red-500' : ''}
                  />
                  {errors.currentPassword && <p className="text-red-500">{errors.currentPassword}</p>}
                </div>

                <div>
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={errors.newPassword ? 'border-red-500' : ''}
                  />
                  {errors.newPassword && <p className="text-red-500">{errors.newPassword}</p>}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && <p className="text-red-500">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>
          <Button className="mb-16 mt-8" onClick={handleSubmit}>Changer le mot de passe</Button>
        </div>
        </div>
      )}
    </div>
  );
}
