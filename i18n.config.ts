export default defineI18nConfig(() => ({
    legacy: false,
    locale: 'fr',
    messages: {
      en: {
        welcome: 'Welcome'
      },
      fr: {
        global: {
            name: "chartman2.fr",
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
          "name": "EIRL chartman2.fr",
          "fields": {
            "name": "Nom",
            "address": "Adresse",
            "siren": "SIRET",
            "website": "Site web",
            "contact": "Contact",
            "hosting": "Hébergement"
          },
          "texts": {
            "name": "Christophe Hartmann",
            "address1": "1 route de Cormery",
            "address2": "37320 Saint Branchs",
            "address3": "France",
            "siren": "752 332 742 00028",
            "website": "https://chartman2.fr",
            "contact": "chartman2.fr[at]gmail[dot]com",
            "hosting": "OVHcloud - SAS",
            "hosting_address": "2 rue Kellermann - 59100 Roubaix - France",
            "hosting_website": "https://www.ovh.com",
            "hosting_name": "OVH"
          }
        },
        articles: {
          title: 'Articles'
        }
      }
    }
  }))