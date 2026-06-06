export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Barre de navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">GestionLocative</h1>
          <div className="flex gap-4">
            <a href="/auth" className="text-gray-600 hover:text-blue-600 font-medium">Connexion</a>
            <a href="/auth" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
              Commencer gratuitement
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          Gérez vos biens locatifs<br />
          <span className="text-blue-600">en toute simplicité</span>
        </h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Connexion bancaire automatique, quittances générées en un clic, 
          coffre-fort numérique. Tout ce dont vous avez besoin pour gérer 
          votre patrimoine immobilier.
        </p>
        <a href="/auth" className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700">
          Essayer gratuitement
        </a>
      </div>

      {/* Fonctionnalités */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">🏦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Connexion bancaire</h3>
            <p className="text-gray-600">Détection automatique de vos loyers sur 50+ banques françaises.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Quittances automatiques</h3>
            <p className="text-gray-600">Générées et archivées automatiquement dès réception du loyer.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Coffre-fort numérique</h3>
            <p className="text-gray-600">Tous vos documents immobiliers centralisés et sécurisés.</p>
          </div>
        </div>
      </div>
    </main>
  );
}