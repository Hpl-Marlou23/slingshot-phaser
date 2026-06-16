import base64
import os

input_path = r'public\assets\new_images\ctaPNG.png'
output_path = r'media\new_images\cta_png.js'

if os.path.exists(input_path):
    with open(input_path, 'rb') as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
    js_content = f'export const ctaPNG = "data:image/png;base64,{encoded_string}";\n'
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as js_file:
        js_file.write(js_content)
    print(f"Successfully created {output_path}")
else:
    print(f"Error: {input_path} not found")
