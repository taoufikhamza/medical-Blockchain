import React, { useState, useEffect } from "react";
import Web3 from "web3";
import ControleAccesABI from "./contracts/ControleAcces.json";
import DossierMedicalABI from "./contracts/DossierMedical.json";
import "./App.css";

// Imports des icônes professionnelles Lucide
import {
  Shield, Clipboard, Stethoscope, User, ShieldCheck, CheckCircle,
  FilePlus, Link, Settings, Lock, Unlock, Search, FileText, Download,
  Check, Pill, FileEdit, Mail, Microscope, PenTool, FileKey, X,
  Calendar, Phone, Mail as MailIcon, CreditCard, Clock, Sun, Moon
} from "lucide-react";

import QRCode from "react-qr-code";

// Helper synchrone pour simuler un Hash IPFS
const simulerIPFSHash = (contenu, timestamp) => {
  let str = contenu + timestamp;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return "Qm" + Math.abs(hash).toString(16).padStart(30, '0') + "x7Y" + str.length;
};

// Helper pour calculer l'âge
const calculateAge = (dob) => {
  if (!dob) return "";
  const diffMs = Date.now() - new Date(dob).getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970) + " ans";
};

// Helper pour générer un nom de docteur fictif basé sur son adresse (pour la démo)
const getDoctorName = (address) => {
  if (!address) return "Dr. Inconnu";
  const names = [
    "Dr. Amine Berrada",
    "Dr. Fatima Zahra El Fassi",
    "Dr. Youssef Alaoui",
    "Dr. Salma Tazi",
    "Dr. Omar Bennani",
    "Dr. Meryem Chraibi"
  ];
  const charCode = address.charCodeAt(address.length - 1);
  return names[charCode % names.length];
};

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [role, setRole] = useState("");
  const [controleAcces, setControleAcces] = useState(null);
  const [dossierMedical, setDossierMedical] = useState(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ message: "", type: "" });

  const [adminInputAddr, setAdminInputAddr] = useState("");
  const [listeUtilisateurs, setListeUtilisateurs] = useState([]);

  const [patientAdresse, setPatientAdresse] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [cin, setCin] = useState("");

  const [modDossierId, setModDossierId] = useState("");
  const [modTelephone, setModTelephone] = useState("");
  const [modEmail, setModEmail] = useState("");

  const [medecinAdresse, setMedecinAdresse] = useState("");
  const [dossierIdInput, setDossierIdInput] = useState("");
  const [dossierData, setDossierData] = useState(null);
  const [notesData, setNotesData] = useState([]);

  const [typeNote, setTypeNote] = useState("0");
  const [contenuNote, setContenuNote] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    loadBlockchainData();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          window.location.reload();
        }
      });
    }
  }, []);

  // --- SÉCURITÉ TEMPS RÉEL : Éjection instantanée si révocation ---
  useEffect(() => {
    let interval;
    if (controleAcces && account && (role === "Medecin" || role === "Secretaire")) {
      interval = setInterval(async () => {
        try {
          if (role === "Medecin") {
            const isCertifie = await controleAcces.methods.medecinsCertifies(account).call();
            if (!isCertifie) window.location.reload(); // Éjection forcée
          } else if (role === "Secretaire") {
            const isActif = await controleAcces.methods.secretairesActifs(account).call();
            if (!isActif) window.location.reload(); // Éjection forcée
          }
        } catch (err) {
          console.error("Erreur de vérification de sécurité en temps réel", err);
        }
      }, 3000); // Vérification toutes les 3 secondes
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [controleAcces, account, role]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 5000);
  };

  const loadBlockchainData = async () => {
    try {
      if (!window.ethereum) {
        showToast("Veuillez installer l'extension MetaMask !", "error");
        setLoading(false);
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
        showToast("Erreur: Contrats non déployés sur ce réseau.", "error");
        setLoading(false);
        return;
      }

      const caInstance = new web3Instance.eth.Contract(ControleAccesABI.abi, caNetwork.address);
      const dmInstance = new web3Instance.eth.Contract(DossierMedicalABI.abi, dmNetwork.address);

      setControleAcces(caInstance);
      setDossierMedical(dmInstance);

      const roleNum = await caInstance.methods.getRole(accounts[0]).call();
      const roles = ["Admin", "Secretaire", "Medecin", "Patient"];
      let currentRole = roles[Number(roleNum)];

      if (currentRole === "Admin") {
        const trueAdmin = await caInstance.methods.admin().call();
        if (trueAdmin.toLowerCase() !== accounts[0].toLowerCase()) {
          // On vérifie si c'est un patient en regardant s'il a déjà des dossiers
          const dossiers = await dmInstance.methods.getMesDossiers().call({ from: accounts[0] });
          if (dossiers && dossiers.length > 0) {
            currentRole = "Patient";
          } else {
            currentRole = "Visiteur";
          }
        } else {
          chargerUtilisateurs(caInstance, dmInstance);
        }
      } else if (currentRole === "Medecin") {
        const isCertifie = await caInstance.methods.medecinsCertifies(accounts[0]).call();
        if (!isCertifie) currentRole = "Visiteur";
      } else if (currentRole === "Secretaire") {
        const isActif = await caInstance.methods.secretairesActifs(accounts[0]).call();
        if (!isActif) currentRole = "Visiteur";
      }

      setRole(currentRole);
      setLoading(false);
    } catch (error) {
      console.error(error);
      showToast("Erreur de connexion avec Web3.", "error");
      setLoading(false);
    }
  };

  const chargerUtilisateurs = async (caInstance, dmInstanceToUse = dossierMedical) => {
    try {
      const eventsMed = await caInstance.getPastEvents('MedecinCertifie', { fromBlock: 0, toBlock: 'latest' });
      const eventsSec = await caInstance.getPastEvents('SecretaireEnregistre', { fromBlock: 0, toBlock: 'latest' });

      let usersMap = {};

      for (let event of eventsMed) {
        let addr = event.returnValues.medecin;
        let actif = await caInstance.methods.medecinsCertifies(addr).call();
        usersMap[addr] = { adresse: addr, role: 'Médecin', actif: actif };
      }

      for (let event of eventsSec) {
        let addr = event.returnValues.secretaire;
        let actif = await caInstance.methods.secretairesActifs(addr).call();
        usersMap[addr] = { adresse: addr, role: 'Secrétaire', actif: actif };
      }

      if (dmInstanceToUse) {
        const eventsDossier = await dmInstanceToUse.getPastEvents('DossierCree', { fromBlock: 0, toBlock: 'latest' });
        for (let event of eventsDossier) {
          let addr = event.returnValues.patient;
          if (!usersMap[addr]) {
            usersMap[addr] = { adresse: addr, role: 'Patient', actif: true };
          }
        }
      }

      setListeUtilisateurs(Object.values(usersMap));
    } catch (err) {
      console.error("Erreur chargement utilisateurs:", err);
    }
  };

  // --- ACTIONS ADMIN ---
  const handleAdminAction = async (actionType, addr = adminInputAddr) => {
    if (!addr) {
      showToast("Veuillez saisir une adresse.", "error");
      return;
    }
    try {
      if (actionType === "certifier") {
        await controleAcces.methods.certifierMedecin(addr).send({ from: account });
        showToast("Médecin certifié avec succès.");
      } else if (actionType === "enregistrer") {
        await controleAcces.methods.enregistrerSecretaire(addr).send({ from: account });
        showToast("Secrétaire enregistré.");
      } else if (actionType === "desactiverMedecin") {
        await controleAcces.methods.desactiverMedecin(addr).send({ from: account });
        showToast("Médecin désactivé (accès révoqué).");
      } else if (actionType === "desactiverSecretaire") {
        await controleAcces.methods.desactiverSecretaire(addr).send({ from: account });
        showToast("Secrétaire désactivée (accès révoqué).");
      }
      if (addr === adminInputAddr) setAdminInputAddr("");
      chargerUtilisateurs(controleAcces);
    } catch (err) {
      showToast("Transaction refusée (Admin).", "error");
    }
  };

  // --- ACTIONS SECRETAIRE ---
  const creerDossier = async () => {
    try {
      await dossierMedical.methods.creerDossier(
        patientAdresse, nom, prenom, dateNaissance, telephone, email, cin
      ).send({ from: account });
      showToast("Dossier créé avec succès !");
      setPatientAdresse("");
      setNom("");
      setPrenom("");
      setDateNaissance("");
      setTelephone("");
      setEmail("");
      setCin("");
    } catch (err) {
      showToast("Erreur lors de la création du dossier.", "error");
    }
  };

  const modifierInfos = async () => {
    if (!modDossierId) {
      showToast("Veuillez indiquer l'ID du dossier.", "error");
      return;
    }
    try {
      await dossierMedical.methods.modifierInfosAdmin(
        modDossierId, modTelephone, modEmail
      ).send({ from: account });
      showToast("Informations modifiées avec succès !");
      setModDossierId("");
      setModTelephone("");
      setModEmail("");
    } catch (err) {
      showToast("Erreur lors de la modification. Dossier introuvable ou accès refusé.", "error");
    }
  };

  // --- ACTIONS PATIENT ---
  const gererAccesMedecin = async (autoriser) => {
    try {
      if (autoriser) {
        await controleAcces.methods.autoriserAcces(medecinAdresse).send({ from: account });
        showToast("Accès autorisé avec succès au médecin.");
      } else {
        await controleAcces.methods.retirerAcces(medecinAdresse).send({ from: account });
        showToast("Accès révoqué.");
      }
    } catch (err) {
      showToast("Erreur lors de la modification des autorisations.", "error");
    }
  };

  // --- ACTIONS MEDECIN / PATIENT ---
  const consulterDossier = async () => {
    try {
      const dossier = await dossierMedical.methods.getDossier(dossierIdInput).call({ from: account });
      const notes = await dossierMedical.methods.getNotes(dossierIdInput).call({ from: account });
      setDossierData(dossier);
      setNotesData(notes);
      showToast("Dossier récupéré depuis la blockchain.");
    } catch (err) {
      showToast("Accès refusé ou dossier inexistant.", "error");
      setDossierData(null);
    }
  };

  const ajouterNote = async () => {
    if (!contenuNote) {
      showToast("La note ne peut pas être vide.", "error");
      return;
    }
    try {
      await dossierMedical.methods.ajouterNote(
        dossierIdInput, typeNote, contenuNote
      ).send({ from: account });
      showToast("Note médicale ajoutée avec succès !");
      setContenuNote("");
      consulterDossier();
    } catch (err) {
      showToast("Erreur: Accès refusé ou médecin non certifié.", "error");
    }
  };

  // --- EXPORT PDF ---
  const exporterPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="app-container" style={{ paddingTop: '50px' }}>
        <div className="main-header-card">
          <h1>Connexion Web3 en cours...</h1>
          <p>Veuillez autoriser MetaMask</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* HEADER PRINCIPAL */}
      <div className="main-header-card" style={{ position: 'relative' }}>
        <button
          className="theme-toggle no-print"
          onClick={() => setDarkMode(!darkMode)}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-main)', cursor: 'pointer', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', width: 'auto' }}
          title="Basculer le mode sombre"
        >
          {darkMode ? <Sun size={20} color="#fcd34d" /> : <Moon size={20} />}
        </button>
        <img src="/medical_logo.png" alt="Medical Block Logo" className="logo-img" />
        <h1>Medical Block</h1>
        {role !== "Visiteur" && (
          <div className="role-badge">
            {role === "Admin" && <><Shield size={18} /> Gouvernance Administrateur</>}
            {role === "Secretaire" && <><Clipboard size={18} /> Pôle Accueil & Secrétariat</>}
            {role === "Medecin" && <><Stethoscope size={18} /> Espace Praticien Médical</>}
            {role === "Patient" && <><User size={18} /> Portail Patient Sécurisé</>}
          </div>
        )}
        <div className="connection-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} title={account}>
          <div style={{
            width: '10px', height: '10px',
            backgroundColor: role === "Visiteur" ? 'var(--danger)' : 'var(--success)',
            borderRadius: '50%',
            boxShadow: role === "Visiteur" ? '0 0 8px var(--danger)' : '0 0 8px var(--success)'
          }}></div>
          <span>
            {role === "Visiteur" ? "Accès Restreint : " : "Connecté : "}
            <strong>{account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : "En attente"}</strong>
          </span>
        </div>
      </div>

      {toast.message && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
          <button style={{ width: 'auto', padding: '6px 8px', marginLeft: '15px', background: 'transparent', color: 'inherit', border: 'none', cursor: 'pointer' }} onClick={() => setToast({ message: '', type: '' })}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ==============================================================
          VUE ADMINISTRATEUR
          ============================================================== */}
      {role === "Admin" && (
        <div className="glass-container no-print">
          <h2><ShieldCheck size={24} /> Panneau de Gouvernance</h2>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>Clé Publique Ethereum (Médecin ou Secrétaire)</label>
            <input
              placeholder="Ex: 0x123..."
              value={adminInputAddr}
              onChange={(e) => setAdminInputAddr(e.target.value)}
            />
          </div>
          <div className="grid-2">
            <button onClick={() => handleAdminAction("certifier")}><CheckCircle size={18} /> Certifier le Médecin</button>
            <button className="secondary" onClick={() => handleAdminAction("enregistrer")}><CheckCircle size={18} /> Enregistrer la Secrétaire</button>
          </div>

          <h3 style={{ marginTop: '30px', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={20} /> Liste des Professionnels</h3>
          <div style={{ overflowX: 'auto', marginTop: '15px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--surface)', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: 'var(--surface-border)', color: 'var(--text-main)' }}>
                  <th style={{ padding: '12px 16px' }}>Adresse</th>
                  <th style={{ padding: '12px 16px' }}>Rôle</th>
                  <th style={{ padding: '12px 16px' }}>Statut</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listeUtilisateurs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Aucun professionnel enregistré.</td>
                  </tr>
                ) : (
                  listeUtilisateurs.map((u, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.9rem' }}>{u.adresse.substring(0, 8)}...{u.adresse.substring(38)}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--primary)' }}>{u.role}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.actif ?
                          <span style={{ background: '#10b98122', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Actif</span> :
                          <span style={{ background: '#ef444422', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>Inactif / Révoqué</span>
                        }
                      </td>
                      <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                        {u.role === 'Patient' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
                            <Shield size={14} color="var(--primary)" /> Dossier Protégé
                          </span>
                        ) : u.actif ? (
                          <button className="danger" style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }} onClick={() => handleAdminAction(u.role === 'Médecin' ? 'desactiverMedecin' : 'desactiverSecretaire', u.adresse)}>
                            Désactiver
                          </button>
                        ) : (
                          <button className="secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }} onClick={() => handleAdminAction(u.role === 'Médecin' ? 'certifier' : 'enregistrer', u.adresse)}>
                            Réactiver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================================
          VUE VISITEUR (NON AUTORISÉ)
          ============================================================== */}
      {role === "Visiteur" && (
        <div className="glass-container no-print" style={{ textAlign: 'center', padding: '60px 30px', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)', borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
          <div style={{ background: 'white', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 10px 25px rgba(56, 189, 248, 0.2)' }}>
            <img src="/maroc.svg" alt="CHU" style={{ height: '60px' }} />
          </div>
          <h2 style={{ color: '#0f172a', fontSize: '2.2rem', marginBottom: '16px', fontWeight: '800', letterSpacing: '-0.5px' }}>Centre Hospitalier Universitaire</h2>
          <p style={{ fontSize: '1.15rem', color: '#475569', maxWidth: '650px', margin: '0 auto 30px', lineHeight: '1.7' }}>
            Système d'Information Hospitalier (SIH). L'accès à ce portail est strictement réservé au personnel médical et administratif habilité.
          </p>

          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '550px', margin: '0 auto', textAlign: 'left', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
              <Lock size={22} /> Accès Restreint
            </p>
            <p style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '1rem', lineHeight: '1.6' }}>
              Votre profil n'est pas encore activé. Veuillez transmettre votre identifiant de connexion à la Direction de l'Hôpital pour valider vos droits d'accès :
            </p>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
              <code style={{ color: '#0f172a', fontSize: '1rem', fontWeight: '600', wordBreak: 'break-all' }}>{account}</code>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          VUE SECRETAIRE
          ============================================================== */}
      {role === "Secretaire" && (
        <>
          <div className="glass-container no-print">
            <h2><FilePlus size={24} /> Création d'un Nouveau Dossier</h2>
            <div className="grid-2">
              <div className="form-group">
                <label>Clé Publique du Patient (Ethereum)</label>
                <input placeholder="0x..." value={patientAdresse} onChange={(e) => setPatientAdresse(e.target.value)} />
              </div>
              <div className="form-group">
                <label>CIN / Passeport</label>
                <input placeholder="Ex: AB12345" value={cin} onChange={(e) => setCin(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Nom de famille</label>
                <input value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Prénom</label>
                <input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Date de Naissance</label>
                <input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Numéro de Téléphone</label>
                <input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email de contact</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <button onClick={creerDossier} style={{ marginTop: '20px' }}><CheckCircle size={18} /> Enregistrer le dossier du patient</button>
          </div>

          <div className="glass-container no-print">
            <h2><Settings size={24} /> Mise à jour des informations administratives</h2>
            <div className="grid-2">
              <div className="form-group">
                <label>ID du Dossier</label>
                <input type="number" value={modDossierId} onChange={(e) => setModDossierId(e.target.value)} placeholder="Ex: 1" />
              </div>
              <div className="form-group">
                <label>Nouveau Téléphone</label>
                <input value={modTelephone} onChange={(e) => setModTelephone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Nouvel Email</label>
                <input type="email" value={modEmail} onChange={(e) => setModEmail(e.target.value)} />
              </div>
            </div>
            <button onClick={modifierInfos} className="secondary" style={{ marginTop: '16px' }}>Mettre à jour</button>
          </div>
        </>
      )}

      {/* ==============================================================
          VUE PATIENT
          ============================================================== */}
      {role === "Patient" && (
        <div className="glass-container no-print">
          <h2><Lock size={24} /> Mes Autorisations d'Accès</h2>
          <div className="form-group">
            <label>Clé Publique du Médecin à gérer</label>
            <input onChange={(e) => setMedecinAdresse(e.target.value)} placeholder="0x..." />
          </div>
          <div className="grid-2">
            <button onClick={() => gererAccesMedecin(true)}><Unlock size={18} /> Autoriser le Médecin</button>
            <button className="danger" onClick={() => gererAccesMedecin(false)}><Lock size={18} /> Révoquer l'Accès</button>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODULE DE CONSULTATION (PATIENT & MEDECIN)
          ============================================================== */}
      {(role === "Medecin" || role === "Patient") && (
        <div className="glass-container">
          <div className="no-print">
            <h2><Search size={24} /> Recherche de Dossier Médical</h2>
            <div className="grid-2" style={{ alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Numéro National du Dossier (ID)</label>
                <input type="number" onChange={(e) => setDossierIdInput(e.target.value)} placeholder="Ex: 1" />
              </div>
              <button onClick={consulterDossier} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Search size={18} /> Consulter le dossier</button>
            </div>
          </div>

          {dossierData && (
            <div id="printable-dossier" style={{ marginTop: '40px', position: 'relative' }}>

              {/* EN-TÊTE D'IMPRESSION OFFICIELLE (Visible uniquement sur le PDF) */}
              <div className="print-header" style={{ display: 'none', width: '100%', marginBottom: '50px', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 30px' }}>
                  {/* Gauche */}
                  <div style={{ textAlign: 'center', width: '250px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontFamily: 'Times New Roman, serif', fontWeight: 'bold', color: '#000' }}>ROYAUME DU MAROC</h3>
                    <p style={{ margin: 0, fontSize: '14px', fontFamily: 'Times New Roman, serif', color: '#000' }}>Ministère de la Santé</p>
                  </div>

                  {/* Centre */}
                  <div style={{ textAlign: 'center', width: '150px' }}>
                    <img src="/maroc.svg" alt="Royaume du Maroc" style={{ height: '85px' }} />
                  </div>

                  {/* Droite */}
                  <div style={{ textAlign: 'center', width: '250px' }} dir="rtl">
                    <h3 style={{ margin: 0, fontSize: '17px', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', color: '#000' }}>المملكة المغربية</h3>
                    <p style={{ margin: 0, fontSize: '15px', fontFamily: 'Arial, sans-serif', color: '#000' }}>وزارة الصحة</p>
                  </div>
                </div>
              </div>

              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}><FileText size={24} /> Dossier Électronique Complet</h2>
                <button className="secondary" onClick={exporterPDF} style={{ width: 'auto' }}><Download size={18} /> Exporter en PDF</button>
              </div>

              {/* EN-TÊTE RÉALISTE DU DOSSIER MEDICAL */}
              <div style={{ marginBottom: '30px', boxShadow: 'var(--shadow)' }}>
                <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <User size={32} color="#38bdf8" />
                      {dossierData.nom.toUpperCase()} {dossierData.prenom}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '12px', fontSize: '0.9rem', color: '#94a3b8', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}>
                        ID: #{String(dossierData.dossierId).padStart(5, '0')}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {dossierData.dateNaissance} ({calculateAge(dossierData.dateNaissance)})</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={14} /> CIN: {dossierData.cin}</span>
                    </div>
                  </div>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '12px' }}>
                    <QRCode value={`ID:${dossierData.dossierId}|CIN:${dossierData.cin}`} size={70} />
                  </div>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '0 0 16px 16px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                  <div className="grid-2">
                    <div>
                      <h4 style={{ color: 'var(--primary)', marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '1rem' }}>Coordonnées</h4>
                      <p style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={16} color="var(--text-muted)" /> {dossierData.telephone}</p>
                      <p style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><MailIcon size={16} color="var(--text-muted)" /> {dossierData.email}</p>
                    </div>
                    <div>
                      <h4 style={{ color: 'var(--primary)', marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '1rem' }}>Statut Administratif</h4>
                      <p style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>Dossier Sécurisé :</strong>
                        <span style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> ACTIF</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIMELINE DES NOTES */}
              <div style={{ padding: '0 30px' }}>
                <h3 style={{ marginTop: '40px', marginBottom: '20px', fontSize: '1.4rem', color: 'var(--text-main)' }}>Documents Médicaux ({notesData.length})</h3>

                {notesData.length === 0 && (
                  <div style={{ background: '#f8fafc', padding: '30px', textAlign: 'center', borderRadius: '12px', color: 'var(--text-muted)', border: '1px dashed #cbd5e1' }}>
                    Aucun document médical n'a été ajouté à ce dossier pour le moment.
                  </div>
                )}

                <div>
                  {notesData.map((note, idx) => {
                    const typeDetails = [
                      { label: "Ordonnance", icon: <Pill size={18} /> },
                      { label: "Observation / Diagnostic", icon: <FileEdit size={18} /> },
                      { label: "Lettre de liaison", icon: <Mail size={18} /> },
                      { label: "Avis médical", icon: <Stethoscope size={18} /> },
                      { label: "Résultat d'analyse", icon: <Microscope size={18} /> }
                    ];
                    const currentType = typeDetails[Number(note.typeNote)];
                    const date = new Date(Number(note.timestamp) * 1000).toLocaleString('fr-FR');

                    return (
                      <div key={idx} style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '24px', marginBottom: '24px', position: 'relative', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ borderBottom: '2px solid var(--surface-border)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#eff6ff', color: 'var(--primary)', padding: '8px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', marginBottom: '8px' }}>
                              {currentType.icon} {currentType.label.toUpperCase()}
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={14} /> Document enregistré le : {date}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                              {getDoctorName(note.adresseMedecin)}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ID: {note.adresseMedecin.substring(0, 6)}...{note.adresseMedecin.substring(38)}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                              <ShieldCheck size={14} /> Praticien authentifié par le système
                            </p>
                          </div>
                        </div>

                        <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem', color: 'var(--text-main)', lineHeight: '1.8', padding: '10px 0', whiteSpace: 'pre-wrap' }}>
                          {note.contenu}
                        </div>

                        <div style={{ marginTop: '30px', background: 'rgba(0,0,0,0.05)', padding: '16px', borderRadius: '10px', borderLeft: '4px solid var(--primary)', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Link size={18} color="var(--primary)" />
                            <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>Référence d'archivage : {simulerIPFSHash(note.contenu, note.timestamp)}</span>
                          </div>
                          <img src="/medical_logo.png" style={{ height: '50px', objectFit: 'contain' }} alt="Sceau Medical Block" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FORMULAIRE D'AJOUT DE NOTE (RESERVE AU MEDECIN) */}
              {role === "Medecin" && (
                <div className="no-print" style={{ marginTop: '40px', padding: '30px', background: 'var(--background)', borderRadius: '16px', border: '2px solid var(--primary)', boxShadow: 'var(--shadow)' }}>
                  <h3 style={{ color: 'var(--primary)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><PenTool size={26} /> Rédiger un nouveau document médical</h3>
                  <div className="grid-2" style={{ marginBottom: '20px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Type de Document</label>
                      <select onChange={(e) => setTypeNote(e.target.value)} value={typeNote}>
                        <option value="0">Ordonnance</option>
                        <option value="1">Observation / Diagnostic</option>
                        <option value="2">Lettre de liaison</option>
                        <option value="3">Avis médical</option>
                        <option value="4">Résultat d'analyse</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Contenu de l'acte médical (Observation, Prescription, etc.)</label>
                    <textarea rows="6" value={contenuNote} onChange={(e) => setContenuNote(e.target.value)} placeholder="Décrivez l'état du patient ou rédigez l'ordonnance ici..."></textarea>
                  </div>
                  <button onClick={ajouterNote} style={{ padding: '16px', fontSize: '1.1rem' }}><CheckCircle size={20} /> Valider et enregistrer au dossier</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;