import base64

# Ouvre le modèle en mode binaire
with open("model.onnx", "rb") as model_file:
    # Convertit en base64
    encoded_string = base64.b64encode(model_file.read()).decode("utf-8")
    
    # Sauvegarde dans un fichier texte pour que vous puissiez le copier
    with open("model_base64.txt", "w") as text_file:
        text_file.write(encoded_string)

print("Conversion terminée ! Ouvrez model_base64.txt et copiez tout le contenu.")