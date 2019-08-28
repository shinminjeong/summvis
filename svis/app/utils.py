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

def bag_of_entities(g1, g2, doc_pd, summary):
    entities = set()
    for g, elist in doc_pd[["group","entities"]].values:
        if g in [g1, g2]:
            entities.update(elist)
    for g in [g1, g2]:
        summ = summary[g[:6].upper()]
        for idx, s in enumerate(summ):
            entities.update(s[2])
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


def generate_plots(g1, g2, method, doc_pd, summ_gt, summ_bl, summ_mmd, tsne_p):
    name_flag = "{}_{}".format(g1, g2)
    print(doc_pd)
    # print(summary)
    E = bag_of_entities(g1, g2, doc_pd, summ_gt)

    sentence_map = dict()
    doc_entities = dict()
    for g, docid, entities, seq, sen in doc_pd[["group", "docid", "entities", "seq", "sentence"]].values:
        if g in [g1, g2]:
            name = "{}_{}_{}".format(g, docid, seq)
            if name in doc_entities:
                doc_entities[name].extend(entities)
            else:
                doc_entities[name] = entities
            sentence_map[name] = sen
            print(name, entities)

    # baselines
    for summ in [s for s in summ_bl if s["comp"] == "{}_{}".format(g1, g2)]:
        smethod = summ["method"]
        s1 = summ["sents"][0]
        s2 = summ["sents"][1]
        for gg, ss in [(g1, s1), (g2, s2)]:
            for seq, s in enumerate(ss):
                name = "{}_baseline-{}_{}".format(gg, smethod, seq)
                searched = doc_pd.loc[doc_pd['sentence'] == s]
                entities = searched["entities"].values[0]
                if name in doc_entities:
                    doc_entities[name].extend(entities)
                else:
                    doc_entities[name] = entities
                sentence_map[name] = s
                print(name, entities)

    params = json.load(open("app/data/gs03-avg-bestparams.json"))
    # mmd methods
    for summ in [s for s in summ_mmd if s["comp"] == "{}_{}".format(g1, g2)]:
        smethod = summ["method"].replace("_", "-")
        lambdaa = summ["lambdaa"]
        r = summ["r"]
        if params[summ["method"]]["lambdaa"] != str(lambdaa) or params[summ["method"]]["r"] != str(r):
            continue
        s1 = summ["sents"][0]
        s2 = summ["sents"][1]
        for gg, ss in [(g1, s1), (g2, s2)]:
            for seq, s in enumerate(ss):
                name = "{}_{}_{}".format(gg, smethod, seq)
                searched = doc_pd.loc[doc_pd['sentence'] == s]
                entities = searched["entities"].values[0]
                if name in doc_entities:
                    doc_entities[name].extend(entities)
                else:
                    doc_entities[name] = entities
                sentence_map[name] = s
                print(name, entities)

    # summary ground truth
    for g in [g1, g2]:
        summ = summ_gt[g[:6].upper()]
        for idx, s in enumerate(summ):
            name = "{}_groundtruth_{}".format(g, idx)
            entities = s[2]
            if name in doc_entities:
                doc_entities[name].extend(entities)
            else:
                doc_entities[name] = entities
            sentence_map[name] = s[1]
            print(name, entities)


    doc_label = dict()
    doc_label_str = dict()
    vec = dict()
    for name, d_entities in sorted(list(doc_entities.items())):
        vec[name] = get_vector(name, E, d_entities)
        doc_label[name] = []
        for e, x in zip(E, vec[name]):
            # if (name.split("_")[1] == "summary" and x > 0) or x >= 0.3:
            if x > 0:
                doc_label[name].append((e, x))
    #     # print(name, vec[name])
    # print(doc_label)

    for name, v in doc_label.items():
        # doc_label_str[name] = "\n".join(["{} ({:.2f})".format(e, x) for e, x in sorted(v, key=lambda x: x[1], reverse=True)[:10]])
        doc_label_str[name] = [[x[0], round(x[1],2)] for x in sorted(v, key=lambda x: x[1], reverse=True)]
    # print(doc_label_str)

    number_of_entities = len(E)
    # reduce_and_save(vec, number_of_entities, name_flag)
    if method == "tsne":
        return reduce_vec_tsne(vec, tsne_p, number_of_entities), doc_label_str, sentence_map
    elif method == "pca":
        return reduce_vec_pca(vec, number_of_entities), doc_label_str, sentence_map


if __name__ == '__main__':
    data = pd.read_hdf("/Users/minjeongshin/Work/summvis/svis/app/data/duc.h5", key = "duc2004")
    summ = json.load(open("/Users/minjeongshin/Work/summvis/svis/app/data/summ2004.json"))

    generate_plots("d30053t", data[data["group"]=="d30053t"], summ["D30053"], 20)
