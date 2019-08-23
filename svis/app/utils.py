import os, json, itertools
import numpy as np
from collections import Counter
from datetime import datetime
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

def save_plot_result(filename, dictdata):
    with open("/Users/minjeongshin/Work/summvis/svis/app/data/{}.json".format(filename), "w") as outfile:
        json.dump(dictdata, outfile)

def bag_of_entities(doc_pd):
    entities = set()
    for elist in doc_pd["entities"].values:
        entities.update(elist)
    print("size of bag_of_entities", len(entities))
    return list(entities)

def get_vector(cname, E, doc_E):
    c = Counter(doc_E)
    vec = [c[v]/len(doc_E) for v in E]
    return vec

def reduce_vec_pca(vec, number_of_entities):
    pca = PCA(n_components=2)
    X = np.zeros((len(vec),number_of_entities))
    for i, v in enumerate(vec.values()):
        X[i] = v
    pca.fit(X)
    X_pca = pca.transform(X)
    # print("original shape:   ", X.shape)
    # print("transformed shape:", X_pca.shape)
    result = {}
    for i, k in enumerate(vec.keys()):
        result[k] = X_pca[i].tolist()
    return result

def reduce_vec_tsne(vec, p, number_of_entities):
    # first reduce to 50D with PCA
    print(len(vec), number_of_entities)
    pca = PCA(n_components=50)
    X = np.zeros((len(vec), number_of_entities))
    for i, v in enumerate(vec.values()):
        X[i] = np.array(v).T
    pca.fit(X)
    X_pca = pca.transform(X)

    tsne = TSNE(n_components=2, perplexity=p)
    X_tsne = tsne.fit_transform(X_pca)
    # print("original shape:   ", X.shape)
    # print("transformed shape:", X_tsne.shape)
    result = {}
    for i, k in enumerate(vec.keys()):
        result[k] = X_tsne[i].tolist()
    return result

def reduce_and_save(vec, number_of_entities, name_flag):
    res = reduce_vec_tsne(vec, 20, number_of_entities)
    save_plot_result(name_flag, res)


def generate_plots(g1, g2, doc_pd, summary, tsne_p):
    name_flag = "{}_{}".format(g1, g2)
    # print(doc_pd)
    # print(summary)
    E = bag_of_entities(doc_pd)

    doc_entities = dict()
    for g, docid, entities, seq in doc_pd[["group", "docid", "entities", "seq"]].values:
        if g in [g1, g2]:
            name = "{}_{}_{}".format(g, docid, seq)
            if name in doc_entities:
                doc_entities[name].extend(entities)
            else:
                doc_entities[name] = entities
            # print(name, entities)

    # summary
    for g in [g1, g2]:
        summ = summary[g[:6].upper()]
        for idx, s in enumerate(summ):
            name = "{}_summary_{}".format(g, idx)
            entities = s[2]
            if name in doc_entities:
                doc_entities[name].extend(entities)
            else:
                doc_entities[name] = entities
            # print(name, entities)


    ## generate year_bov for each entity
    vec = {}
    for name, d_entities in sorted(list(doc_entities.items())):
        vec[name] = get_vector(name, E, d_entities)
        # print(name, vec[name])
    number_of_entities = len(E)
    # reduce_and_save(vec, number_of_entities, name_flag)
    return reduce_vec_tsne(vec, tsne_p, number_of_entities)

if __name__ == '__main__':
    data = pd.read_hdf("/Users/minjeongshin/Work/summvis/svis/app/data/duc.h5", key = "duc2004")
    summ = json.load(open("/Users/minjeongshin/Work/summvis/svis/app/data/summ2004.json"))

    generate_plots("d30053t", data[data["group"]=="d30053t"], summ["D30053"], 20)
