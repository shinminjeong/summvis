from django.shortcuts import render, render_to_response
from django.http import HttpResponse, JsonResponse
from django.template import Context
from django.template.context_processors import csrf
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.conf import settings

import os, json
import pandas as pd
from collections import Counter
from .utils import generate_plots

global input_file_1, input_file_2, label, senmap

def main(request):
    return render(request, "main.html")

def menu(request):
    file_type = request.GET.get("type")
    data_path = os.path.join(os.getcwd(), "app/data", file_type)
    avail_data = sorted(os.listdir(data_path))
    return render(request, "menu.html", {"type": file_type, "list": avail_data})

def plot(request):
    global input_file_1, input_file_2, label, senmap
    input_file_1 = request.GET.get("input1")
    input_file_2 = request.GET.get("input2")
    tsne_p = int(request.GET.get("p"))
    verbose = request.GET.get("verbose")
    grid_test = request.GET.get("grid_test")
    contour = request.GET.get("contour")

    data = pd.read_hdf("/Users/minjeongshin/Work/summvis/svis/app/data/duc.h5", key = "duc2004")
    summ = json.load(open("/Users/minjeongshin/Work/summvis/svis/app/data/summ2004.json"))
    # print(data)

    data, label, senmap = generate_plots(input_file_1, input_file_2, data, summ, tsne_p)
    # print(senmap)
    # data = json.loads(open(data_path).read())

    return render(request, "plot.html", {
        "input_data": data,
        "ent_label": label,
    })

@csrf_exempt
def search(request):
    global input_file_1, input_file_2, label, senmap
    text = ""
    rawinfo = {}
    refcounter = []
    paper_arr = []
    print("inputfile", input_file_1, input_file_2)

    print_threshold = 0.3
    selected_nodes = request.POST.get("nodes")
    print(selected_nodes)
    paper_arr = json.loads(selected_nodes)
    for p in sorted(paper_arr):
        text += "[{}] {}<br>{}<br><br>".format(p, label[p], senmap[p])

    print("-------------------------------")
    print("Total {} sentences selected".format(len(paper_arr)))
    print("-------------------------------")
    text += "<br>Total {} sentences selected<br><br>".format(len(paper_arr))
    print("-------------------------------")
    text += "<br>"

    return JsonResponse({"text": text})
