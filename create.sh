#!/bin/bash

# Choix du type
echo "Quel type de fichier voulez vous créer ?"
read -p "Sélection : " choice

function create-directory {
    local dir=$(basename "$1")

    if [ -d "$dir" ]; then
        echo "Répertoire existant"
    else
        mkdir -p "$dir"
    fi
}

function create-file {
    create-directory $1

    touch $1
    touch tests/{$1}
}

case $choice in
    "page")
        read -p echo "Nom de la page : " name

        create-file pages/${name}.vue
        create-file tests/pages/${name}.vue
        ;;
    "component")
        read -p echo "Nom du component : " name
        
        create-file components/${name}.vue
        create-file tests/components/${name}.vue
        ;;
    "stores")
        read -p echo "Nom du store : " name
        
        create-file stores/${name}.vue
        create-file tests/stores/${name}.vue
        ;;
    *)
        echo "Option invalide"
        ;;
esac

