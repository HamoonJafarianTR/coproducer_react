import os
from dotenv import load_dotenv
from openai import AzureOpenAI

    
def describeVideo(user_prompt):
    load_dotenv()
    client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint = os.getenv('AZURE_OPENAI_ENDPOINT'))
    system_prompt = "Assume you are a journalist. I give you multiple descriptions of video scnenes in the user_prompt separated by --. I want you to combine them into one paragraph that describes the whole video."

    response = client.chat.completions.create(
    model="hj",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    )
    return (response.choices[0].message.content)
