from pymilvus import MilvusClient
from transformers import AutoTokenizer, CLIPTextModelWithProjection
import torch
from pymilvus.model.sparse import BM25EmbeddingFunction # type: ignore
from pymilvus import AnnSearchRequest, WeightedRanker, RRFRanker, connections, Collection


def embed(query):
    text_model = CLIPTextModelWithProjection.from_pretrained("openai/clip-vit-base-patch32")
    tokenizer = AutoTokenizer.from_pretrained("openai/clip-vit-base-patch32", clean_up_tokenization_spaces = False)
    inputs = tokenizer([query], padding=True, return_tensors="pt")
    with torch.no_grad():
        outputs = text_model(**inputs)
    text_embed = outputs.text_embeds
    text_embed_vector = text_embed.tolist()[0]
    return text_embed_vector


def text_search(text_query):
    client = MilvusClient("server/coproducer.db")
    query_embed = embed(text_query)
    res = [[]]

    res = client.search(
        collection_name="coproducer",
        anns_field="frameEmbedding",
        data=[query_embed],
        limit=4,
        output_fields=['framePath', 'shot', 'shotStart', 'shotEnd' ,'videoPath', 'date', 'headline', 'keyword', 'location', 'persons', 'description', 'usn'],
        search_params={"metric_type": "COSINE", "params": {"level": 1}}
        )
    client.close()
    return res[0]
