library(tidyverse)

quick_summary <- function(data) {
	walk(colnames(data), function(colname) {
		cat(crayon::red(paste0(colname, ": ")))
		unique_vals <- unique(data[[colname]])
		unique_vals_short <- unique_vals
		end_str <- ""
		if (length(unique_vals) > 10) {
			unique_vals_short <- unique_vals[1:10]
			end_str <- crayon::red(" ...")
		}
		unique_vals_short <- sort(unique_vals_short, na.last = FALSE)
		cat(paste(map_chr(unique_vals_short, function(val) {
			if (is.na(val)) {
				crayon::magenta(val)
			} else if (is.character(val)) {
				paste0("'", crayon::cyan(val), "'")
			} else if (is.numeric(val)) {
				crayon::green(val)
			} else if (is.logical(val)) {
				crayon::yellow(val)
			} else {
				crayon::red(val)
			}
		}), collapse = " "))
		cat(end_str, "\n", sep = "")
	})
}

nh_stats <- read_delim("data2022/2022_NH.stats.txt", col_types = cols())
nh_titres <- read_delim(
	"data2022/2022_NH.titers.txt",
	# NOTE(sen) I assume the columns are the same in NH.stats and NH.titres
	col_names = c(
		"year", "hemisphere", "type", "test", "testing_lab", "location", "serum_lab", "cohort",
		"strain", "passage", "antigen", "pid", "prevax", "postvax", "vaccine"
	),
	col_types = cols()
)

quick_summary(nh_stats)
quick_summary(nh_titres)

vis2022 <- nh_titres %>%
	pivot_longer(c(prevax, postvax), names_to = "timepoint", values_to = "titre") %>%
	mutate(
		clade = "uncladed",
		#timepoint = recode(timepoint, "prevax" = "Pre-vax", "postvax" = "Post-vax"),
		egg_cell = if_else(passage == "Egg", "Egg", "Cell"),
		clade_freq = 0.5,
		virus = paste0(strain, if_else(egg_cell == "Egg", "e", "")) %>%
			tolower() %>%
			tools::toTitleCase() %>%
			str_replace("^a/", "A/") %>%
			str_replace("^b/", "B/"),
		serum_id = paste(testing_lab, cohort, location, vaccine, pid, sep = "__")
	) %>%
	select(
		serum_id, cohort, virus, clade, titre, subtype = type, timepoint,
		egg_cell, serum_source = location, vaccine = vaccine, testing_lab, clade_freq,
	) %>%
	mutate(
		vaccine_strain = virus %in% c(
			"A/Darwin/6/2021e",
			"A/Victoria/2570/2019e",
			"B/Washington/02/2019e",
			"B/Phuket/3073/2013e"
	    ),
	)

# NOTE(sen) Should be one row per id, virus, timpepoint
vis2022 %>%
	group_by(serum_id, virus, timepoint) %>%
	filter(n() > 1)

quick_summary(vis2022)

write_csv(vis2022, "data2022/vis2022.csv")
write_csv(vis2022, "titre-visualizer/vis2022.csv")

summarise_logmean <- function(vec) {
	vec <- na.omit(vec)
	log_vec <- log(vec)
	mean_log_vec <- mean(log_vec)
	sd_log_vec <- sd(log_vec)
	se_mean_log_vec <- sd_log_vec / sqrt(length(vec))
	tdf <- length(vec) - 1
	quant <- qt(0.95, tdf)
	quant <- qnorm(0.95, 0, 1)
	mean_log_vec_low <- mean_log_vec - quant * se_mean_log_vec
	mean_log_vec_high <- mean_log_vec + quant * se_mean_log_vec
	tibble(
		mean = exp(mean_log_vec), low = exp(mean_log_vec_low), high = exp(mean_log_vec_high),
		logmean = mean_log_vec, se_logmean = se_mean_log_vec,
		pt = 1 - pt((mean_log_vec - log(0.5)) / se_mean_log_vec, tdf),
		pn = 1 - pnorm((mean_log_vec - log(0.5)) / se_mean_log_vec, 0, 1)
	)
}

nh_titres %>%
	filter(cohort == "Adult", location == "UK", vaccine == "IIV4", testing_lab == "CDC") %>%
	group_by(cohort, location, vaccine, testing_lab, pid) %>%
	mutate(ratio_to_ref = postvax / postvax[antigen == "A/VICTORIA/2570/2019 Egg"]) %>%
	group_by(cohort, location, vaccine, testing_lab, antigen) %>%
	summarise(.groups = "drop", summarise_logmean(ratio_to_ref)) %>%
	print(n = 100)

nh_titres %>%
	filter(cohort == "Adult", location == "Japan", vaccine == "IIV4") %>%
	select(-prevax, -strain, -type, -test, -passage) %>%
	group_by(cohort, location, vaccine, testing_lab, antigen) %>%
	summarise(.groups = "drop", summarise_logmean(postvax)) %>%
	group_by(cohort, location, vaccine, testing_lab) %>%
	mutate(
		logdiff = logmean - logmean[antigen == "A/VICTORIA/2570/2019 Egg"],
		logdiff_se = se_logmean + se_logmean[antigen == "A/VICTORIA/2570/2019 Egg"],
		logdiff_low = logdiff - 1.644854 * se_logmean,
		logdiff_high = logdiff + 1.644854 * se_logmean,
		ratio_to_ref = exp(logdiff),
		ratio_to_ref_low = exp(logdiff_low),
		ratio_to_ref_high = exp(logdiff_high),
		p = 1 - pnorm((logdiff - log(0.5)) / logdiff_se, 0, 1)
	) %>%
	select(-contains("log")) %>%
	print(n = 100)


