'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {jwtDecode} from 'jwt-decode';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import axios from 'axios';
import { UPDATE_USER, UPDATE_PASSWORD, GET_USER_BY_EMAIL } from '@/graphql/user';
import { useToast } from "@/components/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Award, CheckCircle, AlertCircle, Calendar, FileText, Hash } from 'lucide-react';
import { AerodromeCombobox } from '@/components/ui/comboboAerodrome';
import { TimezoneCombobox } from '@/components/ui/timezoneCombobox';
import Flag from 'react-world-flags';

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
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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
  licenses: [] as {
    issue_date: string | number | Date;
    certification_authority: string;
    license_number: string;
    status: string;
    is_valid: string;
    id: string;
    license_type: string;
    expiration_date: string;
  }[],
  language: '',
  speed_unit: '',
  distance_unit: '',
  timezone: '',
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
    if (!userEmail) {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]

      if (token) {
        try {
          const decodedToken = jwtDecode<{ email: string }>(token);
          setUserEmail(decodedToken.email);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Erreur lors de la récupération de l'email de l'utilisateur",
          });
        }
      }
    }
  }, [userEmail]);

  const { data: userData, loading, error: errorUser } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: userEmail || '' },
    skip: !userEmail,
    fetchPolicy: 'cache-first',
  });

  useEffect(() => {
    if (userData && userData.userByEmail) {
      const newFormData: typeof formData = {
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
        language: '',
        speed_unit: '',
        distance_unit: '',
        timezone: '',
      };

      if (JSON.stringify(formData) !== JSON.stringify(newFormData)) {
        setFormData(newFormData);
      }
    }
  }, [userData, formData]);

  const handleCardClick = (cardName: string) => {
    setExpandedCard(expandedCard === cardName ? null : cardName);
  };

  const handleActivate2FA = () => {
    setShow2FAAlert(true);
  };

  const confirmActivate2FA = () => {
    router.push('/administration/2fa');
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | { name: string; value: string }
  ) => {
    let name: string;
    let value: string;
    if ('target' in e) {
      name = e.target.name;
      value = e.target.value;
    } else {
      name = e.name;
      value = e.value;
    }
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
        variables: { currentPassword, newPassword },
      });
      if (data.updatePassword.success) {
        toast({
          title: "Succès",
          description: "Votre mot de passe a été modifié avec succès.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Erreur lors de la modification du mot de passe.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la modification du mot de passe.",
      });
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
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Erreur lors de la récupération des suggestions d'adresse.",
        });
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
    setIsUpdating(true);
    try {
      await updateProfile({
        variables: {
          updateUserInput: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone_number: formData.phone_number,
            address: formData.address,
            date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth) : null,
          },
          image: selectedImage,
        },
      });

      toast({
        title: "Succès",
        description: "Profil mis à jour avec succès",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la mise à jour du profil",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <div className="grid grid-cols-2 grid-rows-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }
  if (errorUser) {
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Erreur lors de la récupération des données utilisateur",
    });
  } ;

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

          <Card className="h-40 cursor-pointer" onClick={() => handleCardClick('preferences')}>
            <CardHeader>
              <CardTitle>Modifier mes préférences</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Modifier les préférences utilisateur pour le site.</p>
            </CardContent>
          </Card>

          <Card className="h-40 cursor-pointer" onClick={() => handleCardClick('licenses')}>
            <CardHeader>
              <CardTitle>Licences</CardTitle>
            </CardHeader>
            <CardContent>
                {formData.licenses && formData.licenses.length > 0 ? (
                <p>{formData.licenses.length} licences</p>
                ) : (
                <p>Aucune licence</p>
                )}
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
        <div className="absolute inset-0 z-40 p-8 shadow-lg rounded-lg pb-14">
          <button
            aria-label="Fermer"
            className="absolute top-4 right-4"
            onClick={() => setExpandedCard(null)}
          >
            <X size={24} />
          </button>
          <h2 className="text-center text-2xl font-semibold mb-12">Vos licences</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {formData.licenses && formData.licenses.length > 0 ? (
              formData.licenses.map((license) => (
                <Card key={license.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Award className="mr-2 text-blue-500" />
                      {license.license_type}
                    </CardTitle>
                    <Badge
                      variant={license.is_valid ? "default" : "destructive"}
                      className="ml-auto"
                    >
                      {license.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Hash className="mr-2 text-gray-400" size={16} />
                      Numéro: {license.license_number}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <FileText className="mr-2 text-gray-400" size={16} />
                      Autorité: {license.certification_authority}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Calendar className="mr-2 text-green-500" size={16} />
                      Délivrée le: {new Date(license.issue_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Calendar className="mr-2 text-red-500" size={16} />
                      Expire le: {new Date(license.expiration_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm">
                      {license.is_valid ? (
                        <CheckCircle className="mr-2 text-green-500" size={16} />
                      ) : (
                        <AlertCircle className="mr-2 text-red-500" size={16} />
                      )}
                      {license.is_valid ? "Valide" : "Non valide"}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Aucune licence</h3>
                <p>Vous n'avez pas encore de licence enregistrée.</p>
              </div>
            )}
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
          {isUpdating ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Button className='mb-16 mt-8' onClick={saveChanges}>Enregistrer les modifications</Button>
          )}
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
            {isUpdating ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Button className='mb-16 mt-8' onClick={saveChanges}>Enregistrer les modifications</Button>
            )}
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

      {expandedCard === 'preferences' && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 z-40 p-8 shadow-lg rounded-lg pb-14">
          <button
            aria-label="Fermer"
            className="absolute top-4 right-4 text-gray-500 dark:text-gray-200"
            onClick={() => setExpandedCard(null)}
          >
            <X size={24} />
          </button>
          <h2 className="text-center text-2xl font-semibold">Modifier les préférences</h2>

          <div className="mt-12">
            <div className="grid gap-4">
              <div className="mt-6">
                <Label htmlFor="preferred_aerodrome">Aérodrome préféré</Label>
                <div className="flex items-center space-x-4">
                <AerodromeCombobox
                  onAerodromeChange={(value) =>
                    handleChange({ name: 'preferred_aerodrome', value })
                  }
                />
                </div>
              </div>

              <div className="mt-6">
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <div className="flex items-center space-x-4">
                  <TimezoneCombobox
                    onTimezoneChange={(value) => handleChange({ name: 'timezone', value })}
                    selectedTimezone={formData.timezone}
                  />
                </div>
              </div>


              <div className="mt-6">
                <Label htmlFor="language">Langue</Label>
                <div className="flex items-center space-x-4">
                  <Button
                    variant={formData.language === 'fr' ? 'default' : 'outline'}
                    onClick={() => handleChange({ name: 'language', value: 'fr' })}
                    className="flex items-center"
                  >
                    <Flag code="FR" className="w-5 h-5 mr-2" />
                    Français
                  </Button>
                  <Button
                    variant={formData.language === 'en' ? 'default' : 'outline'}
                    onClick={() => handleChange({ name: 'language', value: 'en' })}
                    className="flex items-center"
                  >
                    <Flag code="GB" className="w-5 h-5 mr-2" />
                    English
                  </Button>
                  <Button
                    variant={formData.language === 'es' ? 'default' : 'outline'}
                    onClick={() => handleChange({ name: 'language', value: 'es' })}
                    className="flex items-center"
                  >
                    <Flag code="ES" className="w-5 h-5 mr-2" />
                    Español
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <Label htmlFor="speed_unit">Unité de vitesse</Label>
                <div className="flex items-center space-x-4">
                  <Button
                    variant={formData.speed_unit === 'kmh' ? 'default' : 'outline'}
                    onClick={() => handleChange({ name: 'speed_unit', value: 'kmh' })}
                  >
                    km/h
                  </Button>
                  <Button
                    variant={formData.speed_unit === 'mph' ? 'default' : 'outline'}
                    onClick={() => handleChange({ name: 'speed_unit', value: 'mph' })}
                  >
                    mph
                  </Button>
                  <Button
                    variant={formData.speed_unit === 'knots' ? 'default' : 'outline'}
                    onClick={() => handleChange({ name: 'speed_unit', value: 'knots' })}
                  >
                    Knots
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <Label htmlFor="distance_unit">Unité de distance</Label>
                <div className="flex items-center space-x-4">
                  <Button
                    variant={formData.distance_unit === 'km' ? 'default' : 'outline'}
                    onClick={() => handleChange({ name: 'distance_unit', value: 'km' })}
                  >
                    Kilomètres
                  </Button>
                  <Button
                    variant={formData.distance_unit === 'miles' ? 'default' : 'outline'}
                    onClick={() => handleChange({ name: 'distance_unit', value: 'miles' })}
                  >
                    Miles
                  </Button>
                  <Button
                    variant={formData.distance_unit === 'nautical_miles' ? 'default' : 'outline'}
                    onClick={() =>
                      handleChange({ name: 'distance_unit', value: 'nautical_miles' })
                    }
                  >
                    Nautical Miles
                  </Button>
                </div>
              </div>
            </div>

            {isUpdating ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Button className="mb-16 mt-8" onClick={saveChanges}>
                Enregistrer les modifications
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
