import msgpack
import json
import os

#one time use file to migrate old json formatted embeddings to new msgpack ones.
def json_to_msgpack(input_dir):
    # Iterate through each file in the directory
    for filename in os.listdir(input_dir):
        if filename.endswith(".json"):
            try:
                json_path = os.path.join(input_dir, filename)
                with open(json_path, 'r') as f:
                    data = json.load(f)
                    # Convert and save the data to a MessagePack file
                    output_path = os.path.join(input_dir, filename.replace('.json', '.msgpack'))
                    with open(output_path, 'wb') as outfile:
                        packed_data = msgpack.packb(data, use_bin_type=True)
                        outfile.write(packed_data)
                    
                    # Delete the original JSON file cuz disk space has become a precious resource again somehow
                    os.remove(json_path)
                    
                    print(f"Converted and deleted {json_path}, saved to {output_path}")
            except:
                print(f"failed: {json_path}")

if __name__ == "__main__":
    # Replace with the directory containing your JSON files
    input_directory = "/mnt/volume_nyc1_01/bunhook/process_binary"
    json_to_msgpack(input_directory)
