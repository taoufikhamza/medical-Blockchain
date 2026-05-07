// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./ControleAcces.sol";

/**
 * @title DossierMedical
 * @notice Contrat principal gérant les dossiers médicaux et les notes médicales associées.
 * @dev Démontre l'utilisation de la composition (relation `contient` avec Note et `utilise` avec ControleAcces du diagramme UML).
 */
contract DossierMedical {

    /// @notice Énumération des types de notes, respectant exactement le diagramme de classes
    enum TypeNote { Ordonnance, Texte, Lettre, Avis, Analyse }

    /// @notice Structure représentant une note médicale
    struct Note {
        uint noteId;
        uint dossierId;
        address adresseMedecin;
        TypeNote typeNote;
        string contenu;     // Note architecturale: Dans un système lourd, ce contenu pourrait être stocké sur IPFS. Ici conservé on-chain pour démonstration.
        uint timestamp;
    }

    /// @notice Structure représentant un dossier médical
    struct Dossier {
        uint dossierId;
        address patientAdresse;
        string nom;         
        string prenom;
        string dateNaissance;
        string telephone;
        string email;
        string cin;
        bool estActif;
    }

    // --- Variables d'état ---
    ControleAcces public controleAcces; // Lien d'utilisation vers le contrat d'accès

    uint private compteurDossier;
    uint private compteurNote;

    // --- Mappings ---
    mapping(uint => Dossier) private dossiers;
    mapping(uint => Note[]) private notesDossier; // Relation de composition 1 vers 0..* 
    mapping(address => uint[]) private dossiersDuPatient;

    // --- Événements ---
    event DossierCree(uint indexed dossierId, address indexed patient);
    event InfosAdministrativesModifiees(uint indexed dossierId);
    event NoteAjoutee(uint indexed dossierId, uint indexed noteId, address indexed medecin);

    // --- Erreurs Personnalisées (Gas Optimization) ---
    error AccesRefuseSecretaire();
    error AccesRefuseMedecin();
    error AccesRefuseGlobal();
    error DossierInexistant(uint dossierId);
    error AdressePatientInvalide();

    // --- Modificateurs ---
    modifier seulementSecretaire() {
        if (!controleAcces.secretairesActifs(msg.sender)) revert AccesRefuseSecretaire();
        _;
    }

    modifier seulementMedecin(uint _dossierId) {
        address patient = dossiers[_dossierId].patientAdresse;
        // Vérifie l'autorisation du patient ET que le médecin est toujours formellement certifié par l'Admin. Sécurité doublée.
        if (!controleAcces.droitAcces(patient, msg.sender) || !controleAcces.medecinsCertifies(msg.sender)) {
            revert AccesRefuseMedecin();
        }
        _;
    }

    modifier dossierExiste(uint _dossierId) {
        if (!dossiers[_dossierId].estActif && dossiers[_dossierId].patientAdresse == address(0)) {
            revert DossierInexistant(_dossierId);
        }
        _;
    }

    /**
     * @notice Initialise le contrat avec l'adresse du contrat ControleAcces.
     * @param _controleAcces Adresse du contrat ControleAcces déployé.
     */
    constructor(address _controleAcces) {
        require(_controleAcces != address(0), "Adresse ControleAcces invalide");
        controleAcces = ControleAcces(_controleAcces);
    }

    /**
     * @notice Création d'un dossier médical par la secrétaire.
     * @dev Les données (chaînes) sont passées en calldata pour optimiser le Gas.
     */
    function creerDossier(
        address _patient,
        string memory _nom,
        string memory _prenom,
        string memory _dateNaissance,
        string memory _tel,
        string memory _email,
        string memory _cin
    ) external seulementSecretaire {
        if (_patient == address(0)) revert AdressePatientInvalide();

        compteurDossier++;
        uint nouveauDossierId = compteurDossier;

        dossiers[nouveauDossierId] = Dossier({
            dossierId: nouveauDossierId,
            patientAdresse: _patient,
            nom: _nom,
            prenom: _prenom,
            dateNaissance: _dateNaissance,
            telephone: _tel,
            email: _email,
            cin: _cin,
            estActif: true
        });

        dossiersDuPatient[_patient].push(nouveauDossierId);

        emit DossierCree(nouveauDossierId, _patient);
    }

    /**
     * @notice Modifie les informations administratives de contact du patient.
     * @dev Action réservée à la secrétaire selon le diagramme UML.
     */
    function modifierInfosAdmin(
        uint _dossierId,
        string memory _tel,
        string memory _email
    ) external seulementSecretaire dossierExiste(_dossierId) {
        dossiers[_dossierId].telephone = _tel;
        dossiers[_dossierId].email = _email;
        
        emit InfosAdministrativesModifiees(_dossierId);
    }

    /**
     * @notice Ajoute une note médicale au dossier.
     * @dev Action sécurisée : réservée au médecin qui est certifié ET autorisé par le patient.
     */
    function ajouterNote(
        uint _dossierId,
        TypeNote _type,
        string memory _contenu
    ) external dossierExiste(_dossierId) seulementMedecin(_dossierId) {
        compteurNote++;
        uint nouvelleNoteId = compteurNote;

        notesDossier[_dossierId].push(Note({
            noteId: nouvelleNoteId,
            dossierId: _dossierId,
            adresseMedecin: msg.sender,
            typeNote: _type,
            contenu: _contenu,
            timestamp: block.timestamp
        }));

        emit NoteAjoutee(_dossierId, nouvelleNoteId, msg.sender);
    }

    /**
     * @notice Consulter un dossier médical spécifique.
     * @param _dossierId Identifiant du dossier.
     * @return Dossier Les informations complètes du dossier.
     */
    function getDossier(uint _dossierId) external view dossierExiste(_dossierId) returns (Dossier memory) {
        address patient = dossiers[_dossierId].patientAdresse;
        
        // L'authentification demandée dans le diagramme de cas d'utilisation est vérifiée ici via la clé privée (msg.sender) :
        // 1. Soit c'est le patient lui-même (Consulter son dossier)
        // 2. Soit c'est un médecin certifié ET autorisé par le patient (Consulter un dossier médical)
        // 3. Soit c'est une secrétaire active (bien que non spécifié comme cas direct, nécessaire pour des raisons administratives)
        bool estPatient = (msg.sender == patient);
        bool estMedecinAutorise = (controleAcces.droitAcces(patient, msg.sender) && controleAcces.medecinsCertifies(msg.sender));
        bool estSecretaire = controleAcces.secretairesActifs(msg.sender);

        if (!estPatient && !estMedecinAutorise && !estSecretaire) {
            revert AccesRefuseGlobal();
        }

        return dossiers[_dossierId];
    }

    /**
     * @notice Permet au patient de récupérer la liste des IDs de ses propres dossiers.
     * @return uint[] Tableau d'identifiants de dossiers.
     */
    function getMesDossiers() external view returns (uint[] memory) {
        // Authentification via msg.sender : garantit que l'on ne retourne que les dossiers de l'appelant
        return dossiersDuPatient[msg.sender];
    }

    /**
     * @notice Consulter les notes médicales associées à un dossier.
     * @dev Réservé au Patient lui-même ou au Médecin autorisé.
     */
    function getNotes(uint _dossierId) external view dossierExiste(_dossierId) returns (Note[] memory) {
        address patient = dossiers[_dossierId].patientAdresse;

        bool estPatient = (msg.sender == patient);
        bool estMedecinAutorise = (controleAcces.droitAcces(patient, msg.sender) && controleAcces.medecinsCertifies(msg.sender));

        if (!estPatient && !estMedecinAutorise) {
            revert AccesRefuseGlobal();
        }

        return notesDossier[_dossierId];
    }
}