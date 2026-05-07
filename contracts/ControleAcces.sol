// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * @title ControleAcces
 * @notice Gère les rôles (Admin, Secrétaire, Médecin, Patient) et les permissions d'accès.
 * @dev L'authentification demandée dans le diagramme UML de cas d'utilisation est garantie nativement par la cryptographie de la blockchain via `msg.sender`.
 */
contract ControleAcces {
    
    /// @notice Définition des différents rôles du système selon le diagramme de classes
    enum Role { Admin, Secretaire, Medecin, Patient }
    
    /// @notice Adresse de l'administrateur système (déployeur du contrat)
    address public admin;
    
    // --- Mappings (Stockage d'état) ---
    mapping(address => Role) public roles;
    mapping(address => bool) public medecinsCertifies;
    mapping(address => bool) public secretairesActifs;
    
    // autorisations[patient][medecin] = true/false
    mapping(address => mapping(address => bool)) public autorisations;
    
    // --- Événements (Events) pour tracer les actions sur la blockchain (Essentiel pour une DApp pro) ---
    event SecretaireEnregistre(address indexed secretaire);
    event SecretaireDesactive(address indexed secretaire);
    event MedecinCertifie(address indexed medecin);
    event MedecinDesactive(address indexed medecin);
    event AccesAutorise(address indexed patient, address indexed medecin);
    event AccesRetire(address indexed patient, address indexed medecin);
    
    // --- Erreurs Personnalisées (Custom Errors) pour optimiser grandement le coût en Gas ---
    error AccesRefuse(string raison);
    error AdresseInvalide();
    error NonCertifie(address medecin);

    // --- Modificateurs ---
    modifier seulementAdmin() {
        if (msg.sender != admin) revert AccesRefuse("Admin uniquement");
        _;
    }
    
    modifier seulementSecretaire() {
        if (!secretairesActifs[msg.sender]) revert AccesRefuse("Secretaire uniquement");
        _;
    }

    modifier adresseValide(address _adresse) {
        if (_adresse == address(0)) revert AdresseInvalide();
        _;
    }

    /**
     * @notice Initialise le contrat et assigne le rôle Admin au déployeur.
     */
    constructor() {
        admin = 0xcCe9F083A7EeeB0d50Cc2819dD17a2CEFAd363C6;
        roles[0xcCe9F083A7EeeB0d50Cc2819dD17a2CEFAd363C6] = Role.Admin;
        roles[msg.sender] = Role.Admin;
    }
    
    /**
     * @notice Enregistre un nouveau secrétaire.
     * @param _secretaire L'adresse du secrétaire.
     */
    function enregistrerSecretaire(address _secretaire) external seulementAdmin adresseValide(_secretaire) {
        secretairesActifs[_secretaire] = true;
        roles[_secretaire] = Role.Secretaire;
        emit SecretaireEnregistre(_secretaire);
    }
    
    /**
     * @notice Désactive un secrétaire existant.
     * @param _secretaire L'adresse du secrétaire.
     */
    function desactiverSecretaire(address _secretaire) external seulementAdmin adresseValide(_secretaire) {
        secretairesActifs[_secretaire] = false;
        // On conserve son rôle précédent dans l'historique mais on le désactive via secretairesActifs
        emit SecretaireDesactive(_secretaire);
    }
    
    /**
     * @notice Certifie un médecin pour qu'il puisse exercer sur la plateforme.
     * @param _medecin L'adresse du médecin.
     */
    function certifierMedecin(address _medecin) external seulementAdmin adresseValide(_medecin) {
        medecinsCertifies[_medecin] = true;
        roles[_medecin] = Role.Medecin;
        emit MedecinCertifie(_medecin);
    }
    
    /**
     * @notice Désactive/Révoque la certification d'un médecin.
     * @param _medecin L'adresse du médecin.
     */
    function desactiverMedecin(address _medecin) external seulementAdmin adresseValide(_medecin) {
        medecinsCertifies[_medecin] = false;
        emit MedecinDesactive(_medecin);
    }
    
    /**
     * @notice Le patient autorise un médecin certifié à consulter/modifier son dossier.
     * @param _medecin L'adresse du médecin.
     */
    function autoriserAcces(address _medecin) external adresseValide(_medecin) {
        if (!medecinsCertifies[_medecin]) revert NonCertifie(_medecin);
        // Authentification implicite : msg.sender = le patient en cours
        autorisations[msg.sender][_medecin] = true;
        
        // Assigne le rôle Patient s'il n'avait pas de rôle préalable
        if (roles[msg.sender] != Role.Admin && roles[msg.sender] != Role.Secretaire && roles[msg.sender] != Role.Medecin) {
            roles[msg.sender] = Role.Patient;
        }
        emit AccesAutorise(msg.sender, _medecin);
    }
    
    /**
     * @notice Le patient retire l'accès à un médecin.
     * @param _medecin L'adresse du médecin.
     */
    function retirerAcces(address _medecin) external adresseValide(_medecin) {
        autorisations[msg.sender][_medecin] = false;
        emit AccesRetire(msg.sender, _medecin);
    }
    
    /**
     * @notice Vérifie si un médecin a reçu l'autorisation explicite d'un patient.
     * @param _patient L'adresse du patient.
     * @param _medecin L'adresse du médecin.
     * @return bool True si autorisé par le patient, sinon false.
     */
    function droitAcces(address _patient, address _medecin) external view returns (bool) {
        return autorisations[_patient][_medecin];
    }
    
    /**
     * @notice Récupère le rôle d'une adresse donnée.
     * @param _adresse L'adresse à interroger.
     * @return Role Le rôle de l'adresse.
     */
    function getRole(address _adresse) external view returns (Role) {
        return roles[_adresse];
    }
}