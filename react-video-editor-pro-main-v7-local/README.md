# CoProducer with React Video Editor Pro
## Download the dataset file
```wget https://a206709-archive.s3.eu-west-1.amazonaws.com/videoSearchDemo/dataset/coproducer.db```

## Move it to the server directory
```mv coproducer.db react-video-editor-pro-main-v7-local/server/```

## Configure Environment Variables
```AZURE_OPENAI_API_KEY= ```

```AZURE_OPENAI_ENDPOINT= ```

## Start the Backend Server
```cd react-video-editor-pro-main-v7-local/server/```

```python main.py```

## Start the Frontend Application
```npm run dev```
