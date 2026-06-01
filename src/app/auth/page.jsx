'use client';
import { useState } from 'react';

export default function Auth() {
  const [mode, setMode] = useState('connexion');

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        
        {/* Logo */}
        <h1 className="text-2xl font-bold text-blue-600 text-center mb-8">GestionLocative</h1>

        {/* Onglets */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
          <button
            onClick={() => setMode('connexion')}
            className={`flex-1 py-2 rounded-md font-medium text-sm transition-all ${
              mode === 'connexion' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode('inscription')}
            className={`flex-1 py-2 rounded-md font-medium text-sm transition-all ${
              mode === 'inscription' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Formulaire connexion */}
        {mode === 'connexion' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button className="bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 mt-2">
              Se connecter
            </button>
            <p className="text-center text-sm text-gray-500">
              Mot de passe oublié ?{' '}
              <span className="text-blue-600 cursor-pointer hover:underline">Réinitialiser</span>
            </p>
          </div>
        )}

        {/* Formulaire inscription */}
        {mode === 'inscription' && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  placeholder="Jean"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  placeholder="Dupont"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button className="bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 mt-2">
              Créer mon compte
            </button>
            <p className="text-center text-sm text-gray-500">
              En vous inscrivant vous acceptez nos{' '}
              <span className="text-blue-600 cursor-pointer hover:underline">CGU</span>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}