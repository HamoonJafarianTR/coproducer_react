videoPath = "shot_2_part_0_45_75.MP4"
name = videoPath.split(".")[0]
row = name.split("_")[1]
start = name.split("_")[4]
end = name.split("_")[5]
fromas = int(start) * 30
durationInFrames = (int(end) - int(start)) * 30

print(row, start, end)