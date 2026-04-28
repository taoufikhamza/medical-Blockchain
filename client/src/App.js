import React, { useState, useEffect } from "react";
import Web3 from "web3";
import ControleAccesABI from "./contracts/ControleAcces.json";
import DossierMedicalABI from "./contracts/DossierMedical.json";

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [role, setRole] = useState("");
  const [controleAcces, setControleAcces] = useState(null);
  const [dossierMedical, setDossierMedical] = useState(null);
  const [loading, setLoading] = useState(true);

  // Formulaire créer dossier
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [cin, setCin] = useState("");
  const [patientAdresse, setPatientAdresse] = useState("");

  // Résultats
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadBlockchainData();
  }, []);

  const loadBlockchainData = async () => {
    try {
      if (!window.ethereum) {
        alert("Installez MetaMask !");
        return;
      }
      const web3Instance = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await web3Instance.eth.getAccounts();
      setAccount(accounts[0]);
      setWeb3(web3Instance);

      const networkId = await web3Instance.eth.net.getId();

      const caNetwork = ControleAccesABI.networks[networkId];
      const dmNetwork = DossierMedicalABI.networks[networkId];

      if (!caNetwork || !dmNetwork) {
        alert("Contrats non déployés sur ce réseau !");
        setLoading(false);
        return;
      }

      const caInstance = new web3Instance.eth.Contract(
        ControleAccesABI.abi,
        caNetwork.address
      );
      const dmInstance = new web3Instance.eth.Contract(
        DossierMedicalABI.abi,
        dmNetwork.address
      );

      setControleAcces(caInstance);
      setDossierMedical(dmInstance);

      // Récupérer le rôle
      const roleNum = await caInstance.methods.getRole(accounts[0]).call();
      const roles = ["Admin", "Secretaire", "Medecin", "Patient"];
      setRole(roles[roleNum]);

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const enregistrerSecretaire = async (adresse) => {
    try {
      await controleAcces.methods
        .enregistrerSecretaire(adresse)
        .send({ from: account });
      setMessage("✅ Secrétaire enregistré !");
    } catch (err) {
      setMessage("❌ Erreur: " + err.message);
    }
  };

  const certifierMedecin = async (adresse) => {
    try {
      await controleAcces.methods
        .certifierMedecin(adresse)
        .send({ from: account });
      setMessage("✅ Médecin certifié !");
    } catch (err) {
      setMessage("❌ Erreur: " + err.message);
    }
  };

  const creerDossier = async () => {
    try {
      await dossierMedical.methods
        .creerDossier(patientAdresse, nom, prenom, dateNaissance, telephone, email, cin)
        .send({ from: account });
      setMessage("✅ Dossier créé avec succès !");
    } catch (err) {
      setMessage("❌ Erreur: " + err.message);
    }
  };

  if (loading) return <h3>🔄 Chargement blockchain...</h3>;

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>🏥 Système de Gestion des Dossiers Médicaux</h1>
      <p><b>Account:</b> {account}</p>
      <p><b>Rôle:</b> {role}</p>

      {message && <p style={{ color: "green" }}>{message}</p>}

      {role === "Admin" && (
        <div style={{ border: "1px solid #ccc", padding: 20, marginBottom: 20 }}>
          <h2>👤 Administration</h2>
          <div>
            <h3>Enregistrer un Secrétaire</h3>
            <input placeholder="Adresse Ethereum" style={{ width: 400 }}
              onChange={(e) => setPatientAdresse(e.target.value)} />
            <button onClick={() => enregistrerSecretaire(patientAdresse)}>
              Enregistrer
            </button>
          </div>
          <div style={{ marginTop: 20 }}>
            <h3>Certifier un Médecin</h3>
            <input placeholder="Adresse Ethereum" style={{ width: 400 }}
              onChange={(e) => setPatientAdresse(e.target.value)} />
            <button onClick={() => certifierMedecin(patientAdresse)}>
              Certifier
            </button>
          </div>
        </div>
      )}

      {role === "Secretaire" && (
        <div style={{ border: "1px solid #ccc", padding: 20, marginBottom: 20 }}>
          <h2>📋 Créer un Dossier Médical</h2>
          <input placeholder="Adresse patient" style={{ width: 400, display: "block", margin: 5 }}
            onChange={(e) => setPatientAdresse(e.target.value)} />
          <input placeholder="Nom" onChange={(e) => setNom(e.target.value)}
            style={{ margin: 5 }} />
          <input placeholder="Prénom" onChange={(e) => setPrenom(e.target.value)}
            style={{ margin: 5 }} />
          <input placeholder="Date naissance" onChange={(e) => setDateNaissance(e.target.value)}
            style={{ margin: 5 }} />
          <input placeholder="Téléphone" onChange={(e) => setTelephone(e.target.value)}
            style={{ margin: 5 }} />
          <input placeholder="Email" onChange={(e) => setEmail(e.target.value)}
            style={{ margin: 5 }} />
          <input placeholder="CIN" onChange={(e) => setCin(e.target.value)}
            style={{ margin: 5 }} />
          <br />
          <button onClick={creerDossier} style={{ marginTop: 10 }}>
            Créer Dossier
          </button>
        </div>
      )}

      {role === "Patient" && (
        <div style={{ border: "1px solid #ccc", padding: 20 }}>
          <h2>👨‍⚕️ Mon Dossier</h2>
          <p>Connectez-vous pour voir vos dossiers et autoriser des médecins.</p>
        </div>
      )}

      {role === "Medecin" && (
        <div style={{ border: "1px solid #ccc", padding: 20 }}>
          <h2>🩺 Espace Médecin</h2>
          <p>Consultez les dossiers des patients qui vous ont autorisé.</p>
        </div>
      )}
    </div>
  );
}

export default App;