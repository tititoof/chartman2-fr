export default defineI18nConfig(() => ({
    legacy: false,
    locale: 'fr',
    messages: {
      en: {
        welcome: 'Welcome'
      },
      fr: {
        global: {
            name: "chartman2-fr.ovh",
            charter: "Charte",
            disconnect: "Déconnexion",
            home: "Accueil",
            legal_notices: "Mentions légales",
            login: "Connexion",
            register: "Inscription",
            articles: "Articles"
        },
        legal_notices: {
          "title": "Mentions Légales",
          "name": "Christophe Hartmann EI — chartman2",
          "fields": {
            "name": "Nom",
            "address": "Adresse",
            "siren": "SIRET",
            "website": "Site web",
            "contact": "Contact",
            "hosting": "Hébergement"
          },
          "texts": {
            "name": "Christophe Hartmann EI",
            "address1": "1 route de Cormery",
            "address2": "37320 Saint Branchs",
            "address3": "France",
            "siren": "752 332 742 00044",
            "website": "https://chartman2-fr.ovh",
            "contact": "chartman2.fr[at]gmail[dot]com",
            "hosting": "IKOULA NET",
            "hosting_address": "2 Cité Paradis 75010 Paris",
            "hosting_website": "https://www.ikoula.com",
            "hosting_name": "IKOULA"
          }
        },
        articles: {
          title: 'Articles'
        }
      }
    }
  }))